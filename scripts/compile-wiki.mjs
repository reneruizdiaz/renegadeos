/**
 * Renegade OS — Wiki Compilation Script
 * Usage: node scripts/compile-wiki.mjs [--domain phd]
 *
 * Reads markdown files from renegade-wiki/raw/<domain>/
 * Calls Anthropic API to extract concepts and write articles
 * Saves compiled wiki to renegade-wiki/wiki/<domain>/
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { createRequire } from 'module'
import { config } from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

// Load .env.local — override: true ensures keys not pre-set by any hook are loaded
config({ path: path.join(process.cwd(), '.env.local'), override: true })

// gray-matter is CJS — use createRequire
const require = createRequire(import.meta.url)
const matter = require('gray-matter')

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const domainIdx = args.indexOf('--domain')
const domain = domainIdx !== -1 ? args[domainIdx + 1] : 'phd'

// ─── Paths ────────────────────────────────────────────────────────────────────

const vaultRoot = path.join(
  os.homedir(),
  'Library/CloudStorage/GoogleDrive-rene.ruizdiaz@gmail.com',
  'My Drive/renegade-wiki'
)
const rawDir  = path.join(vaultRoot, 'raw',  domain)
const wikiDir = path.join(vaultRoot, 'wiki', domain)

// ─── Anthropic client ─────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SONNET = 'claude-sonnet-4-6'
const HAIKU  = 'claude-haiku-4-5-20251001'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paraguayTimestamp() {
  return new Date().toLocaleString('es-PY', {
    timeZone: 'America/Asuncion',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function todayDate() {
  return new Date().toLocaleDateString('es-PY', {
    timeZone: 'America/Asuncion',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

function stripJsonFences(raw) {
  return raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
}

// ─── STEP 1 — READ SOURCES ────────────────────────────────────────────────────

function readSources() {
  if (!fs.existsSync(rawDir)) {
    console.error(`ERROR: Directory not found: ${rawDir}`)
    process.exit(1)
  }

  const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.md'))
  if (files.length === 0) {
    console.error(`ERROR: No .md files found in ${rawDir}`)
    process.exit(1)
  }

  const sources = files.map(filename => {
    const fullPath = path.join(rawDir, filename)
    const raw = fs.readFileSync(fullPath, 'utf-8')
    const parsed = matter(raw)
    return {
      filename,
      title:   parsed.data.title   ?? filename.replace('.md', ''),
      source:  parsed.data.source  ?? null,
      author:  parsed.data.author  ?? null,
      created: parsed.data.created ?? null,
      tags:    parsed.data.tags    ?? [],
      content: parsed.content.trim(),
    }
  })

  console.log(`Found ${sources.length} source files in raw/${domain}/`)
  return sources
}

// ─── STEP 2 — EXTRACT CONCEPTS ───────────────────────────────────────────────

async function extractConcepts(sources) {
  const combined = sources.map(s =>
    `=== ARCHIVO: ${s.filename} ===\nTÍTULO: ${s.title}\n\n${s.content}`
  ).join('\n\n---\n\n')

  const response = await client.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system:
      'Eres un asistente académico especializado en historia cultural latinoamericana, dictaduras del siglo XX y resistencia cultural en Paraguay.',
    messages: [{
      role: 'user',
      content: `Analiza los siguientes documentos de investigación para una tesis doctoral sobre la resistencia cultural bajo la dictadura de Stroessner en Paraguay (1954-1989). El caso central es el Teatro Estudio Libre, el Festival Mandu'arã y la figura de Rudi Torga.

Identifica entre 8 y 15 conceptos clave que aparezcan o sean relevantes para este dominio de investigación.

Para cada concepto devuelve:
- concept_id: identificador snake_case sin acentos
- title: título en español
- description: 2-3 oraciones
- appears_in: array de filenames donde aparece
- related_concepts: array de concept_ids relacionados

Responde SOLO con JSON válido. Sin markdown.
Schema: { "concepts": [{ "concept_id": "", "title": "", "description": "", "appears_in": [], "related_concepts": [] }] }

DOCUMENTOS:
${combined}`,
    }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  let parsed
  try {
    parsed = JSON.parse(stripJsonFences(raw))
  } catch (err) {
    console.error('ERROR: Failed to parse concepts JSON.')
    console.error('Raw response (first 500 chars):', raw.slice(0, 500))
    process.exit(1)
  }

  const concepts = parsed.concepts ?? []
  console.log(`Identified ${concepts.length} concepts`)
  return concepts
}

// ─── STEP 3 — WRITE CONCEPT ARTICLES ─────────────────────────────────────────

async function writeArticles(concepts, sources) {
  fs.mkdirSync(wikiDir, { recursive: true })

  for (const concept of concepts) {
    const relevantSources = sources.filter(s =>
      concept.appears_in.includes(s.filename)
    )

    const sourceContent = relevantSources.map(s =>
      `=== ${s.title} ===\n${s.content}`
    ).join('\n\n---\n\n')

    const relatedLinks = (concept.related_concepts ?? [])
      .map(id => {
        const rel = concepts.find(c => c.concept_id === id)
        return rel ? `[[${id}|${rel.title}]]` : `[[${id}]]`
      })
      .join(', ')

    const sourceLinks = relevantSources.map(s =>
      s.source ? `[${s.title}](${s.source})` : `*${s.title}*`
    ).join('\n- ')

    const response = await client.messages.create({
      model: SONNET,
      max_tokens: 2048,
      system:
        'Eres un asistente académico que escribe artículos de wiki para una tesis doctoral sobre resistencia cultural bajo la dictadura de Stroessner en Paraguay. Escribes en español académico. Solo usas los documentos fuente proporcionados. No inventas hechos.',
      messages: [{
        role: 'user',
        content: `Escribe un artículo de wiki en español sobre:
CONCEPTO: ${concept.title}
DESCRIPCIÓN: ${concept.description}

Estructura EXACTA — respeta exactamente estos encabezados:

## ${concept.title}
[2-3 párrafos basados en las fuentes]

### Relevancia para la investigación
[1 párrafo sobre importancia para la tesis sobre Teatro Estudio Libre / Mandu'arã / Rudi Torga]

### Fuentes
- ${sourceLinks || '*(sin fuentes directas)*'}

### Ver también
${relatedLinks || '*(sin artículos relacionados)*'}

---
*Compilado por Renegade OS — ${todayDate()}*

DOCUMENTOS FUENTE:
${sourceContent || '*(No hay fuentes directas para este concepto)*'}`,
      }],
    })

    const articleContent = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : ''

    const outPath = path.join(wikiDir, `${concept.concept_id}.md`)
    fs.writeFileSync(outPath, articleContent, 'utf-8')
    console.log(`Written wiki/${domain}/${concept.concept_id}.md`)
  }
}

// ─── STEP 4 — WRITE INDEX.md ──────────────────────────────────────────────────

async function writeIndex(concepts, sources) {
  // Generate research questions
  const conceptList = concepts.map(c => `- ${c.concept_id}: ${c.title} — ${c.description}`).join('\n')
  const sourcePreview = sources.slice(0, 6).map(s => s.content).join('\n\n').slice(0, 6000)

  const questionsResponse = await client.messages.create({
    model: SONNET,
    max_tokens: 1024,
    system:
      'Eres un asistente académico especializado en historia cultural latinoamericana y metodología de investigación doctoral.',
    messages: [{
      role: 'user',
      content: `Sugiere 5 preguntas de investigación específicas para capítulos de una tesis doctoral sobre el Teatro Estudio Libre y la resistencia cultural bajo Stroessner. Específicas, investigables, en español académico. Solo las 5 preguntas numeradas, sin introducción.

CONCEPTOS IDENTIFICADOS:
${conceptList}

FRAGMENTOS DE FUENTES:
${sourcePreview}`,
    }],
  })

  const questions = questionsResponse.content[0].type === 'text'
    ? questionsResponse.content[0].text.trim()
    : ''

  // Build concept list section
  const conceptLines = concepts
    .map(c => `- [[${c.concept_id}|${c.title}]] — ${c.description}`)
    .join('\n')

  // Build connection map
  const connectionLines = concepts
    .filter(c => c.related_concepts && c.related_concepts.length > 0)
    .map(c => {
      const links = c.related_concepts.map(id => {
        const rel = concepts.find(r => r.concept_id === id)
        return rel ? `[[${id}|${rel.title}]]` : `[[${id}]]`
      }).join(', ')
      return `**${c.title}** → ${links}`
    })
    .join('\n')

  // Build quick access
  const quickLinks = concepts.map(c => `- [[${c.concept_id}|${c.title}]]`).join('\n')

  const indexContent = `# Wiki de Investigación — PhD
*Última compilación: ${paraguayTimestamp()}*
*Fuentes: ${sources.length} documentos | Conceptos: ${concepts.length} artículos*

## Conceptos principales
${conceptLines}

## Mapa de conexiones
${connectionLines || '*(sin conexiones identificadas)*'}

## Preguntas de investigación sugeridas
${questions}

## Acceso rápido
- [[SOURCES|Fuentes completas]]
${quickLinks}
`

  const indexPath = path.join(wikiDir, 'INDEX.md')
  fs.writeFileSync(indexPath, indexContent, 'utf-8')
  console.log(`Written wiki/${domain}/INDEX.md`)
}

// ─── STEP 5 — WRITE SOURCES.md ────────────────────────────────────────────────

async function writeSources(sources, concepts) {
  const summaries = []

  for (const source of sources) {
    const response = await client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      system: 'Eres un asistente académico conciso.',
      messages: [{
        role: 'user',
        content: `Resume en 2 oraciones en español este artículo. Solo los hechos más importantes. Sin introducción.
TÍTULO: ${source.title}
CONTENIDO: ${source.content.slice(0, 3000)}`,
      }],
    })

    const summary = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : ''

    summaries.push({ ...source, summary })
    console.log(`Summarized: ${source.filename}`)
  }

  const sections = summaries.map(s => {
    const coveredConcepts = concepts
      .filter(c => c.appears_in.includes(s.filename))
      .map(c => c.title)
      .join(', ')

    const urlLine = s.source
      ? `- **URL:** [${s.source}](${s.source})`
      : `- **URL:** *(sin URL)*`

    const tagsStr = Array.isArray(s.tags) ? s.tags.join(', ') : (s.tags ?? '')

    return `## ${s.title}
${urlLine}
- **Capturado:** ${s.created ?? '*(sin fecha)*'}
- **Tags:** ${tagsStr || '*(sin tags)*'}
- **Conceptos cubiertos:** ${coveredConcepts || '*(ninguno identificado)*'}
- **Resumen:** ${s.summary}`
  }).join('\n\n')

  const sourcesContent = `# Fuentes — raw/${domain}/
*${sources.length} documentos — ${paraguayTimestamp()}*

${sections}
`

  const sourcesPath = path.join(wikiDir, 'SOURCES.md')
  fs.writeFileSync(sourcesPath, sourcesContent, 'utf-8')
  console.log(`Written wiki/${domain}/SOURCES.md`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nRenegade OS — Wiki Compilation`)
  console.log(`Domain: ${domain}`)
  console.log(`Vault:  ${vaultRoot}\n`)

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set. Check .env.local')
    process.exit(1)
  }

  const sources  = readSources()
  const concepts = await extractConcepts(sources)
  await writeArticles(concepts, sources)
  await writeIndex(concepts, sources)
  await writeSources(sources, concepts)

  console.log(`\nDone. Wiki compiled to: ${wikiDir}`)
  console.log(`Open INDEX.md in Obsidian to begin.`)
}

main().catch(err => {
  console.error('ERROR:', err.message ?? err)
  process.exit(1)
})
