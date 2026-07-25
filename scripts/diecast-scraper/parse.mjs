import * as cheerio from 'cheerio'

export function extractModelLinks(listHtml) {
  const $ = cheerio.load(listHtml)
  const hrefs = new Set()
  $('a[href^="car/"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) hrefs.add(href.trim())
  })
  return [...hrefs]
}

export function deriveNameFromUrl(href) {
  const file = href.split('/').pop().replace(/\.html?$/i, '')
  const withoutId = file.replace(/^\d+_/, '')
  const parts = withoutId.split('_').filter(Boolean)
  if (parts.length > 1 && parts[0].length <= 3) parts.shift()
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

const PLACEHOLDER_IMAGE = 'carnotfound.jpg'
const SITE_ORIGIN = 'https://smalldiecastcorvettes.com/'

function captionLinesFrom(el, $, manufacturer) {
  const innerHtml = $(el).html() || ''
  const text = innerHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const manufacturerLine = `${manufacturer.toUpperCase()} CORVETTES`
  return lines.filter((l) => l.toUpperCase() !== manufacturerLine)
}

export function parseModelPage(detailHtml, manufacturer) {
  const $ = cheerio.load(detailHtml)
  const variants = []
  $('div.car-description').each((i, el) => {
    const row = $(el).closest('tr')
    const firstRealImg = row
      .find('img')
      .filter((_, img) => {
        const src = $(img).attr('src') || ''
        return !src.includes(PLACEHOLDER_IMAGE)
      })
      .first()
    const src = firstRealImg.attr('src')
    if (!src) return
    const imageUrl = new URL(src, SITE_ORIGIN).toString()
    const captionLines = captionLinesFrom(el, $, manufacturer)
    const caption = captionLines.length ? captionLines.join(', ') : null
    variants.push({ caption, imageUrl, sortOrder: i })
  })
  return { variants }
}
