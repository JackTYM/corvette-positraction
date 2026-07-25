import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extractModelLinks, deriveNameFromUrl, parseModelPage } from './parse.mjs'

const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url))
const listHtml = readFileSync(fixturesDir + 'manufacturer-list.html', 'utf-8')
const detailHtml = readFileSync(fixturesDir + 'model-detail.html', 'utf-8')

describe('extractModelLinks', () => {
  it('extracts every unique car/*.html link from the real manufacturer listing fixture', () => {
    const links = extractModelLinks(listHtml)
    expect(links).toContain('car/4_HW_1953_corvette.html')
    expect(links.length).toBe(new Set(links).size)
    expect(links.every((l) => l.startsWith('car/') && l.endsWith('.html'))).toBe(true)
    expect(links.length).toBe(52)
  })
})

describe('deriveNameFromUrl', () => {
  it('strips the numeric id and short manufacturer code, converts underscores to spaces', () => {
    expect(deriveNameFromUrl('car/4_HW_1953_corvette.html')).toBe('1953 corvette')
  })
  it('handles a double-underscore slug', () => {
    expect(deriveNameFromUrl('car/36_HW__63_corvette.html')).toBe('63 corvette')
  })
})

describe('parseModelPage', () => {
  it('extracts one variant per row with a real primary image, skipping the redundant manufacturer caption line', () => {
    const { variants } = parseModelPage(detailHtml, 'Hot Wheels')
    expect(variants.length).toBe(7)
    const first = variants[0]
    expect(first.imageUrl).toBe('https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg')
    expect(first.caption).toContain('Showcase #1')
    expect(first.caption?.toUpperCase()).not.toContain('HOT WHEELS CORVETTES')
  })

  it('never returns a placeholder carnotfound.jpg image, even when it appears before a real image in document order', () => {
    const { variants } = parseModelPage(detailHtml, 'Hot Wheels')
    expect(variants.every((v) => !v.imageUrl.includes('carnotfound'))).toBe(true)

    const placeholderFirstHtml = `
      <table><tbody><tr>
        <td><img src=imgitems/carnotfound.jpg></td>
        <td><div class="car-description">Test Brand CORVETTES<br />Placeholder-first variant<br /></div></td>
        <td><img src=imgitems/car_99_1.jpg></td>
      </tr></tbody></table>
    `
    const { variants: reordered } = parseModelPage(placeholderFirstHtml, 'Test Brand')
    expect(reordered.length).toBe(1)
    expect(reordered[0].imageUrl).toBe('https://smalldiecastcorvettes.com/imgitems/car_99_1.jpg')
  })

  it('skips a row entirely when its only image has no src, without dropping a later real image in the same row', () => {
    const brokenThenRealHtml = `
      <table><tbody><tr>
        <td><img></td>
        <td><div class="car-description">Test Brand CORVETTES<br />Broken-then-real variant<br /></div></td>
        <td><img src=imgitems/car_100_1.jpg></td>
      </tr></tbody></table>
    `
    const { variants } = parseModelPage(brokenThenRealHtml, 'Test Brand')
    expect(variants.length).toBe(1)
    expect(variants[0].imageUrl).toBe('https://smalldiecastcorvettes.com/imgitems/car_100_1.jpg')
  })
})
