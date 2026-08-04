import 'dotenv/config'
import postgres from 'postgres'
import { extractModelLinks, deriveNameFromUrl, parseModelPage } from './diecast-scraper/parse.mjs'

const SITE_ORIGIN = 'https://smalldiecastcorvettes.com/'
const REQUEST_DELAY_MS = 500
const REQUEST_TIMEOUT_MS = 15_000

// Real single-manufacturer catalog pages under manufac/*.html. Excludes Hot Wheels
// (already scraped) and the site's curated cross-brand lists (New Releases, Rick E's
// Top 50 Rarest, New Additions, Fastest to the Finish, Micro Corvettes and 1/87th Scale),
// which mix models already covered by their real manufacturer pages above.
const MANUFACTURERS = [
  { name: 'Aurora', slug: 'Aurora_Corvettes' },
  { name: '1 Badd Ride', slug: '1_Badd_Ride_Corvettes' },
  { name: 'Corgi', slug: 'Corgi_Corvettes' },
  { name: 'Dinky', slug: 'Dinky_Corvettes' },
  { name: 'Edocar', slug: 'Edocar_Corvettes' },
  { name: 'Ertl', slug: 'Ertl_Corvettes' },
  { name: 'Greenlight', slug: 'Greenlight_Corvettes' },
  { name: 'Hartoy', slug: 'Hartoy_Corvettes' },
  { name: 'Ideal', slug: 'Ideal_Corvettes' },
  { name: 'Impy Lonestar', slug: 'Impy_Lonestar_Corvettes' },
  { name: 'Jada', slug: 'Jada_Corvettes' },
  { name: 'Johnny Lightning', slug: 'Johnny_Lightning_Corvettes' },
  { name: 'Kenner', slug: 'Kenner_Corvettes' },
  { name: 'Kidco', slug: 'Kidco_Corvettes' },
  { name: 'Lindberg', slug: 'Lindberg_Corvettes' },
  { name: 'Maisto', slug: 'Maisto_Corvettes' },
  { name: 'Majorette', slug: 'Majorette_Corvettes' },
  { name: 'Mandarin', slug: 'Mandarin_Corvettes' },
  { name: 'Matchbox', slug: 'Matchbox_Corvettes' },
  { name: 'Motormax', slug: 'Motormax_Corvettes' },
  { name: 'Muscle Machines', slug: 'Muscle_Machines_Corvettes' },
  { name: 'Muky', slug: 'Muky_Corvettes' },
  { name: 'Playart', slug: 'Playart_Corvettes' },
  { name: 'Racing Champions', slug: 'Racing_Champions_Corvettes' },
  { name: 'Road Champs', slug: 'Road_Champs_Corvettes' },
  { name: 'Summer', slug: 'Summer_Corvettes' },
  { name: 'Tomica Tomy', slug: 'Tomica_Tomy_Corvettes' },
  { name: 'Tootsie Toy', slug: 'Tootsie_Toy_Corvettes' },
  { name: 'Upper Deck', slug: 'Upper_Deck_Corvettes' },
  { name: 'Welly', slug: 'Welly_Corvettes' },
  { name: 'Winners Circle', slug: 'Winners_Circle_Corvettes' },
  { name: 'Yatming', slug: 'Yatming_Corvettes' },
  { name: 'Zee', slug: 'Zee_Corvettes' },
  { name: 'Miscellaneous Brands', slug: 'Miscellaneous_Brands_Corvettes' },
]

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

async function scrapeManufacturer(sql, manufacturer, listUrl) {
  console.log(`Fetching manufacturer list: ${listUrl}`)
  const listHtml = await fetchText(listUrl)
  const links = extractModelLinks(listHtml)
  console.log(`Found ${links.length} model links`)

  let succeeded = 0
  let failed = 0

  for (const href of links) {
    const sourceUrl = new URL(href, SITE_ORIGIN).toString()
    try {
      const detailHtml = await fetchText(sourceUrl)
      const name = deriveNameFromUrl(href)
      const { variants } = parseModelPage(detailHtml, manufacturer)
      const coverImageUrl = variants[0]?.imageUrl ?? null

      await sql.begin(async (tx) => {
        const [model] = await tx`
          insert into diecast_models (manufacturer, name, source_url, cover_image_url, updated_at)
          values (${manufacturer}, ${name}, ${sourceUrl}, ${coverImageUrl}, now())
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

  return { succeeded, failed }
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL)
  try {
    let totalSucceeded = 0
    let totalFailed = 0

    for (const { name, slug } of MANUFACTURERS) {
      console.log(`\n=== ${name} ===`)
      const listUrl = `${SITE_ORIGIN}manufac/${slug}.html`
      const { succeeded, failed } = await scrapeManufacturer(sql, name, listUrl)
      totalSucceeded += succeeded
      totalFailed += failed
    }

    console.log(`\nDone. ${totalSucceeded} succeeded, ${totalFailed} failed across ${MANUFACTURERS.length} manufacturers.`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
