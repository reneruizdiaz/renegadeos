import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDriveFile, updateDriveFile } from '@/lib/drive'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── helpers ──────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0] }
function nowISO() { return new Date().toISOString() }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchRSS(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RenegadeOS/1.0' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function parseXML(xml: string, maxItems: number, isYouTube = false) {
  const items: Array<{ title: string; link: string; pubDate: string; source: string }> = []
  const itemRegex = isYouTube
    ? /<entry>([\s\S]*?)<\/entry>/g
    : /<item>([\s\S]*?)<\/item>/g

  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1]
    const title = (block.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   block.match(/<title[^>]*>(.*?)<\/title>/))?.[1]?.trim() ?? ''
    const link = (block.match(/<link[^>]*href="([^"]+)"/) ||
                  block.match(/<link>(.*?)<\/link>/))?.[1]?.trim() ?? ''
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) ||
                     block.match(/<published>(.*?)<\/published>/))?.[1]?.trim() ?? ''
    const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.trim() ?? ''
    if (title) items.push({ title, link, pubDate, source })
  }
  return items
}

function googleNewsURL(query: string, language: string) {
  const q = encodeURIComponent(query)
  return language === 'es'
    ? `https://news.google.com/rss/search?q=${q}&hl=es&gl=PY&ceid=PY:es`
    : `https://news.google.com/rss/search?q=${q}&hl=en&gl=US&ceid=US:en`
}

async function fetchArticles(entry: any) {
  const { type, query, rss_url, language = 'es' } = entry
  const isYT = type === 'youtube'
  const url = (type === 'youtube' || type === 'substack') ? rss_url : googleNewsURL(query, language)
  const xml = await fetchRSS(url)
  return parseXML(xml, isYT ? 2 : 3, isYT)
}

async function summarize(entry: any, articles: any[]) {
  const lines = articles.map((a: any) => `- "${a.title}" | ${a.source} | ${a.pubDate}`).join('\n')
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: 'Eres un analista de inteligencia conciso. Resumes contenido para un ejecutivo en español. Sé específico y factual.',
    messages: [{ role: 'user', content: `Sobre ${entry.name} (${entry.why}):\n\nContenido reciente:\n${lines}\n\nPara cada item relevante escribe:\n- 2-3 oraciones resumiendo el punto clave\n- Título entre comillas\n- Fuente y fecha\n\nSi no aporta nada nuevo o relevante, responde solo: SIN NOVEDAD` }],
  })
  return (res.content[0] as any).text?.trim() ?? ''
}

async function buildCoffeeBrief(signals: any[], dateStr: string) {
  const content = signals.map(e => {
    const links = (e.articles ?? []).map((a: any) => `  - ${a.title} — ${a.link}`).join('\n')
    return `FUENTE: ${e.name} | DOMINIO: ${e.domain}\n${e.summary}\nLINKS:\n${links}`
  }).join('\n\n---\n\n')

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: 'Eres el Chief of Staff de René Ruiz Díaz, ejecutivo paraguayo operando en capital markets, tokenización de activos reales, cine, medios, consultoría cross-border y doctorado en historia. Hablas como asesor senior de confianza. Directo, inteligente, sin relleno corporativo.',
    messages: [{ role: 'user', content: `Son las 7am del ${dateStr}.\nRené lee esto tomando su primer café.\n\n${content}\n\nTu tarea:\n1. Escribe UN párrafo conversacional — el brief de café. Habla directamente a René en segunda persona. Máximo 5 oraciones. Tono: colega inteligente tomando café contigo.\n2. SEÑAL DEL DÍA — solo si algo destaca claramente. Si no, omite.\n\nResponde ONLY con valid JSON:\n{"coffee_brief":"string","signal_of_day":"string or null","signal_reason":"string or null"}` }],
  })
  let raw = (res.content[0] as any).text ?? '{}'
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  return JSON.parse(raw)
}

// ── Drive write via service account ──────────────────────────────────────────

async function writeBriefToDrive(brief: any) {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!keyRaw || !folderId) throw new Error('Missing Drive env vars')

  const key = JSON.parse(keyRaw)
  const auth = new google.auth.JWT(
    key.client_email, undefined, key.private_key,
    ['https://www.googleapis.com/auth/drive']
  )
  const drive = google.drive({ version: 'v3', auth })
  const content = JSON.stringify(brief, null, 2)

  const existing = await drive.files.list({
    q: `'${folderId}' in parents and name='daily-brief.json' and trashed=false`,
    fields: 'files(id)',
  })
  const fileId = existing.data.files?.[0]?.id

  if (fileId) {
    await drive.files.update({ fileId, media: { mimeType: 'application/json', body: content } })
  } else {
    await drive.files.create({
      requestBody: { name: 'daily-brief.json', parents: [folderId] },
      media: { mimeType: 'application/json', body: content },
    })
  }
}

// ── main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Load watchlist from Drive
    const watchlistRaw = await getDriveFile('watchlist.json' as any)
    const entries = (Array.isArray(watchlistRaw) ? watchlistRaw : []).filter((e: any) => e.active === true)

    const results = []
    for (const entry of entries) {
      try {
        const articles = await fetchArticles(entry)
        if (!articles.length) { await sleep(800); continue }
        let summary = ''
        let hasSignal = false
        try {
          summary = await summarize(entry, articles.slice(0, 3))
          hasSignal = summary !== 'SIN NOVEDAD' && summary.length > 0
        } catch {
          summary = articles.map((a: any) => `"${a.title}"`).join('\n')
          hasSignal = true
        }
        results.push({ id: entry.id, name: entry.name, type: entry.type, domain: (entry.domain ?? 'PERSONAL').toUpperCase(), why: entry.why, articles, summary, has_signal: hasSignal, fetched_at: nowISO() })
      } catch (err: any) {
        console.warn(`Fetch failed for ${entry.name}:`, err.message)
      }
      await sleep(800)
    }

    const dateStr = today()
    const signals = results.filter(r => r.has_signal)
    let coffeeBrief = null, signalOfDay = null, signalReason = null

    if (signals.length > 0) {
      try {
        const parsed = await buildCoffeeBrief(signals, dateStr)
        coffeeBrief = parsed.coffee_brief ?? null
        signalOfDay = parsed.signal_of_day ?? null
        signalReason = parsed.signal_reason ?? null
      } catch (err: any) {
        console.warn('Coffee brief failed:', err.message)
      }
    }

    const DOMAINS = ['NEWCO', 'CAPITAL_MARKETS', 'FILM', 'MEDIA', 'SUDESTADA', 'PHD', 'PERSONAL']
    const byDomain: Record<string, any[]> = {}
    for (const d of DOMAINS) byDomain[d] = []
    for (const e of signals) {
      if (!byDomain[e.domain]) byDomain[e.domain] = []
      byDomain[e.domain].push(e)
    }

    const brief = {
      generated_at: nowISO(),
      date: dateStr,
      coffee_brief: coffeeBrief,
      signal_of_day: signalOfDay,
      signal_reason: signalReason,
      total_entries_checked: results.length,
      total_with_signal: signals.length,
      by_domain: byDomain,
    }

    await writeBriefToDrive(brief)

    return NextResponse.json({ ok: true, date: dateStr, signals: signals.length, entries: results.length })
  } catch (err: any) {
    console.error('Cron daily-brief error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
