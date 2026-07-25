import 'dotenv/config'
import postgres from 'postgres'
import { extractModelLinks, deriveNameFromUrl, parseModelPage } from './diecast-scraper/parse.mjs'

const SITE_ORIGIN = 'https://smalldiecastcorvettes.com/'
const MANUFACTURER = 'Hot Wheels'
const MANUFACTURER_LIST_URL = `${SITE_ORIGIN}manufac/Hot_Wheels_Corvettes.html`
const REQUEST_DELAY_MS = 500
const REQUEST_TIMEOUT_MS = 15_000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; corvette-positraction-scraper/1.0)' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ${url}`)
  return res.text()
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL)
  try {
    console.log(`Fetching manufacturer list: ${MANUFACTURER_LIST_URL}`)
    const listHtml = await fetchText(MANUFACTURER_LIST_URL)
    const links = extractModelLinks(listHtml)
    console.log(`Found ${links.length} model links`)

    let succeeded = 0
    let failed = 0

    for (const href of links) {
      const sourceUrl = new URL(href, SITE_ORIGIN).toString()
      try {
        const detailHtml = await fetchText(sourceUrl)
        const name = deriveNameFromUrl(href)
        const { variants } = parseModelPage(detailHtml, MANUFACTURER)
        const coverImageUrl = variants[0]?.imageUrl ?? null

        await sql.begin(async (tx) => {
          const [model] = await tx`
            insert into diecast_models (manufacturer, name, source_url, cover_image_url, updated_at)
            values (${MANUFACTURER}, ${name}, ${sourceUrl}, ${coverImageUrl}, now())
            on conflict (source_url) do update set
              name = excluded.name,
              cover_image_url = excluded.cover_image_url,
              updated_at = now()
            returning id
          `

          await tx`delete from diecast_variants where model_id = ${model.id}`
          if (variants.length > 0) {
            await tx`
              insert into diecast_variants ${tx(
                variants.map((v) => ({ model_id: model.id, caption: v.caption, image_url: v.imageUrl, sort_order: v.sortOrder })),
                'model_id', 'caption', 'image_url', 'sort_order',
              )}
            `
          }
        })

        succeeded++
        console.log(`  ✓ ${name} (${variants.length} variants)`)
      } catch (err) {
        failed++
        console.warn(`  ✗ Failed on ${sourceUrl}:`, err.message)
      }
      await sleep(REQUEST_DELAY_MS)
    }

    console.log(`Done. ${succeeded} succeeded, ${failed} failed.`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
