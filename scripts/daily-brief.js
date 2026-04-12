/**
 * Renegade OS — Daily Brief
 * npm run brief
 *
 * Reads watchlist.json → fetches RSS/YouTube/Substack →
 * Haiku per-entry summaries → Sonnet coffee brief →
 * Writes daily-brief.json to Drive + .md files to Obsidian vault
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { XMLParser } from 'fast-xml-parser'
import Anthropic from '@anthropic-ai/sdk'

// ─── ENV ────────────────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── PATHS ───────────────────────────────────────────────────────────────────

const DRIVE_ROOT = path.join(
  os.homedir(),
  'Library/CloudStorage/GoogleDrive-rene.ruizdiaz@gmail.com',
  'My Drive'
)

const DATA_DIR   = path.join(DRIVE_ROOT, 'renegade-os-data')
const VAULT_ROOT = path.join(os.homedir(), 'renegade-wiki', 'raw')

const WATCHLIST_PATH   = path.join(DATA_DIR, 'watchlist.json')
const BRIEF_OUTPUT     = path.join(DATA_DIR, 'daily-brief.json')

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function today() {
  return new Date().toISOString().split('T')[0]
}

function nowISO() {
  return new Date().toISOString()
}

function encodeQuery(q) {
  return encodeURIComponent(q)
}

function googleNewsRSS(query, language) {
  if (language === 'es') {
    return `https://news.google.com/rss/search?q=${encodeQuery(query)}&hl=es&gl=PY&ceid=PY:es`
  }
  return `https://news.google.com/rss/search?q=${encodeQuery(query)}&hl=en&gl=US&ceid=US:en`
}

// ─── RSS FETCH ────────────────────────────────────────────────────────────────

async function fetchRSS(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RenegadeOS/1.0 (+https://renegade.reneruizdiaz.com)' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

function parseNewsItems(xml, maxItems = 3) {
  const parser = new XMLParser({ ignoreAttributes: false })
  const result = parser.parse(xml)

  const items = result?.rss?.channel?.item ?? []
  const arr = Array.isArray(items) ? items : [items]

  return arr.slice(0, maxItems).map((item) => ({
    title:   stripCDATA(item.title ?? ''),
    link:    item.link ?? item.guid ?? '',
    pubDate: item.pubDate ?? item.published ?? '',
    source:  item?.source?.['#text'] ?? item?.source ?? '',
  }))
}

function parseYouTubeItems(xml, maxItems = 2) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const result = parser.parse(xml)

  // YouTube Atom feed: feed.entry[]
  const entries = result?.feed?.entry ?? []
  const arr = Array.isArray(entries) ? entries : [entries]

  return arr.slice(0, maxItems).map((e) => ({
    title:   e.title ?? '',
    link:    e.link?.['@_href'] ?? '',
    pubDate: e.published ?? '',
    source:  'YouTube',
  }))
}

function stripCDATA(str) {
  if (typeof str !== 'string') return String(str ?? '')
  return str.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
}

// ─── FETCH BY TYPE ────────────────────────────────────────────────────────────

async function fetchArticlesForEntry(entry) {
  const { type, query, rss_url, language = 'es' } = entry

  if (type === 'youtube') {
    const xml = await fetchRSS(rss_url)
    return parseYouTubeItems(xml, 2)
  }

  if (type === 'substack') {
    const xml = await fetchRSS(rss_url)
    return parseNewsItems(xml, 3)
  }

  // person | company | subject | product | cultural
  const url = googleNewsRSS(query, language)
  const xml  = await fetchRSS(url)
  return parseNewsItems(xml, 3)
}

// ─── HAIKU SUMMARY ───────────────────────────────────────────────────────────

async function summarizeEntry(entry, articles) {
  const articleLines = articles
    .map((a) => `- "${a.title}" | ${a.source} | ${a.pubDate}`)
    .join('\n')

  const userPrompt = `Sobre ${entry.name} (${entry.why}):

Contenido reciente:
${articleLines}

Para cada item relevante escribe:
- 2-3 oraciones resumiendo el punto clave
- Título entre comillas
- Fuente y fecha

Si no aporta nada nuevo o relevante, omítelo completamente y responde solo: SIN NOVEDAD`

  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:     'Eres un analista de inteligencia conciso. Resumes contenido para un ejecutivo en español. Sé específico y factual.',
    messages:   [{ role: 'user', content: userPrompt }],
  })

  const text = response.content[0]?.text ?? ''
  return text.trim()
}

// ─── COFFEE BRIEF (SONNET) ────────────────────────────────────────────────────

async function buildCoffeeBrief(signalEntries, dateStr) {
  const entriesText = signalEntries
    .map((e) => {
      const links = (e.articles ?? []).map((a) => `  - ${a.title} — ${a.link}`).join('\n')
      return `FUENTE: ${e.name} | DOMINIO: ${e.domain}\n${e.summary}\nLINKS:\n${links}`
    })
    .join('\n\n---\n\n')

  const userPrompt = `Son las 7am del ${dateStr}.
René lee esto tomando su primer café.

Aquí está todo el contenido con señal de hoy:

${entriesText}

Tu tarea:
1. Escribe UN párrafo conversacional — el brief de café.
   Habla directamente a René en segunda persona (tú).
   Menciona SOLO lo genuinamente nuevo, sorprendente o accionable hoy.
   Si algo conecta con sus proyectos activos menciona el proyecto por nombre:
   - Newco MVP (deadline julio 31, 2026)
   - Maldecidos (shoot julio 13, 2026)
   - Sudestada (advisory pipeline)
   - PhD Stroessner (Teatro Estudio Libre)
   Si hoy hay poco que valga, dilo honestamente.
   Tono: colega inteligente tomando café contigo.
   NO boletín corporativo. NO lista de puntos.
   Máximo 5 oraciones.

2. SEÑAL DEL DÍA — solo si algo destaca claramente sobre todo lo demás.
   Si no hay nada que destaque, omite esta sección completamente.
   Formato si existe:
   Una línea en negrita describiendo qué es.
   Una oración explicando por qué importa hoy.

Responde ONLY con valid JSON:
{
  "coffee_brief": "string",
  "signal_of_day": "string or null",
  "signal_reason": "string or null"
}`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1000,
    system: `Eres el Chief of Staff de René Ruiz Díaz, ejecutivo paraguayo operando en capital markets, tokenización de activos reales, cine, medios, consultoría cross-border y doctorado en historia. Hablas como asesor senior de confianza. Directo, inteligente, sin relleno corporativo.`,
    messages: [{ role: 'user', content: userPrompt }],
  })

  let raw = response.content[0]?.text ?? '{}'
  // Strip markdown fences if present
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  return JSON.parse(raw)
}

// ─── VAULT WRITER ─────────────────────────────────────────────────────────────

function writeDomainVaultFile(domain, entries, dateStr, timestamp) {
  const dirPath = path.join(VAULT_ROOT, domain.toLowerCase(), 'news')
  fs.mkdirSync(dirPath, { recursive: true })

  const filePath = path.join(dirPath, `${dateStr}.md`)

  const sections = entries.map((e) => {
    const links = (e.articles ?? [])
      .map((a) => `- [${a.title}](${a.link}) — ${a.source} — ${a.pubDate}`)
      .join('\n')
    return `## ${e.name}\n${e.summary}\n\n**Fuentes:**\n${links}`
  })

  const content = `# Brief de Inteligencia — ${domain} — ${dateStr}
*Generado: ${timestamp}*

---

${sections.join('\n\n---\n\n')}

---
*Renegade OS daily-brief.js*
`

  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`  ✓ Written raw/${domain.toLowerCase()}/news/${dateStr}.md`)
}

// ─── GROUP BY DOMAIN ─────────────────────────────────────────────────────────

const DOMAINS = ['NEWCO', 'CAPITAL_MARKETS', 'FILM', 'MEDIA', 'SUDESTADA', 'PHD', 'PERSONAL']

function groupByDomain(entries) {
  const result = {}
  for (const d of DOMAINS) result[d] = []
  for (const e of entries) {
    const d = (e.domain ?? 'PERSONAL').toUpperCase()
    if (!result[d]) result[d] = []
    result[d].push(e)
  }
  return result
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔲 Renegade OS — Daily Brief\n')

  // STEP 1 — READ WATCHLIST
  if (!fs.existsSync(WATCHLIST_PATH)) {
    console.error(`❌ watchlist.json not found at: ${WATCHLIST_PATH}`)
    process.exit(1)
  }

  const watchlistRaw  = fs.readFileSync(WATCHLIST_PATH, 'utf8')
  const watchlistFull = JSON.parse(watchlistRaw)

  // Separate settings object (last element if it has output_drive_path)
  const settings    = watchlistFull.find((e) => e.output_drive_path) ?? {}
  const entries     = watchlistFull.filter((e) => e.active === true)
  const maxArticles = settings.max_articles_per_entry ?? 3

  console.log(`Loaded ${entries.length} active watchlist entries\n`)

  // STEP 2 — FETCH AND SUMMARIZE
  const results = []

  for (const entry of entries) {
    process.stdout.write(`  ↗  ${entry.name} (${entry.type})... `)

    let articles = []
    try {
      articles = await fetchArticlesForEntry(entry)
    } catch (err) {
      console.warn(`\n  ⚠ Fetch failed for ${entry.name}: ${err.message} — skipping`)
      await sleep(800)
      continue
    }

    if (!articles.length) {
      console.warn(`no articles found — skipping`)
      await sleep(800)
      continue
    }

    // Trim to max_articles
    articles = articles.slice(0, maxArticles)

    let summary   = ''
    let hasSignal = false

    try {
      summary   = await summarizeEntry(entry, articles)
      hasSignal = summary.trim() !== 'SIN NOVEDAD' && summary.trim().length > 0
      console.log(hasSignal ? '✓ signal' : '– no signal')
    } catch (err) {
      console.warn(`\n  ⚠ Haiku failed for ${entry.name}: ${err.message} — using titles`)
      summary   = articles.map((a) => `"${a.title}" — ${a.source}`).join('\n')
      hasSignal = true
    }

    results.push({
      id:          entry.id,
      name:        entry.name,
      type:        entry.type,
      domain:      (entry.domain ?? 'PERSONAL').toUpperCase(),
      why:         entry.why,
      articles,
      summary,
      has_signal:  hasSignal,
      fetched_at:  nowISO(),
    })

    await sleep(800)
  }

  // STEP 3 — COFFEE BRIEF
  const dateStr      = today()
  const timestamp    = nowISO()
  const signalEntries = results.filter((r) => r.has_signal)

  let coffeeBrief  = null
  let signalOfDay  = null
  let signalReason = null

  if (signalEntries.length > 0) {
    console.log(`\n☕ Building coffee brief from ${signalEntries.length} signals...`)
    try {
      const parsed = await buildCoffeeBrief(signalEntries, dateStr)
      coffeeBrief  = parsed.coffee_brief  ?? null
      signalOfDay  = parsed.signal_of_day ?? null
      signalReason = parsed.signal_reason ?? null
    } catch (err) {
      console.warn(`⚠ Sonnet coffee brief failed: ${err.message} — writing brief without it`)
    }
  } else {
    console.log('\n– No signals today. Skipping coffee brief.')
  }

  // STEP 4 — ASSEMBLE BRIEF
  const byDomain = groupByDomain(signalEntries)

  const brief = {
    generated_at:          timestamp,
    date:                  dateStr,
    coffee_brief:          coffeeBrief,
    signal_of_day:         signalOfDay,
    signal_reason:         signalReason,
    total_entries_checked: results.length,
    total_with_signal:     signalEntries.length,
    by_domain:             byDomain,
  }

  // STEP 5 — WRITE TO DRIVE
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(BRIEF_OUTPUT, JSON.stringify(brief, null, 2), 'utf8')
  console.log(`\n✅ Brief written — ${signalEntries.length} signals from ${results.length} entries checked`)

  // Update settings.last_run in watchlist.json
  try {
    const updated = watchlistFull.map((e) => {
      if (e.output_drive_path) return { ...e, last_run: timestamp }
      return e
    })
    fs.writeFileSync(WATCHLIST_PATH, JSON.stringify(updated, null, 2), 'utf8')
  } catch (err) {
    console.warn(`⚠ Could not update last_run in watchlist.json: ${err.message}`)
  }

  // STEP 6 — WRITE TO OBSIDIAN VAULT
  console.log('\n📓 Writing to Obsidian vault...')
  for (const [domain, domainEntries] of Object.entries(byDomain)) {
    if (!domainEntries.length) continue
    try {
      writeDomainVaultFile(domain, domainEntries, dateStr, timestamp)
    } catch (err) {
      console.warn(`⚠ Vault write failed for ${domain}: ${err.message}`)
    }
  }

  console.log('\n🔲 Done.\n')
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
