// compile-wiki.js
// Renegade OS — PhD Wiki Compilation Script
// Run from anywhere: npm run wiki
// Or: node scripts/compile-wiki.js [--domain phd]

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import os from "os";

// Resolve paths relative to this script file — works from any working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(PROJECT_ROOT, ".env.local"), override: true });

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const VAULT_BASE = path.join(os.homedir(), "renegade-wiki");

const domain = process.argv.includes("--domain")
  ? process.argv[process.argv.indexOf("--domain") + 1]
  : "phd";

const RAW_DIR  = path.join(VAULT_BASE, "raw",  domain);
const WIKI_DIR = path.join(VAULT_BASE, "wiki", domain);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function readSources() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`ERROR: Directory not found: ${RAW_DIR}`);
    process.exit(1);
  }
  // Top-level .md files only. raw/<domain>/news/ holds daily-brief clippings,
  // which are not wiki source material.
  const files = fs
    .readdirSync(RAW_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("."))
    .map((e) => e.name);
  if (files.length === 0) {
    console.error(`ERROR: No .md files found in ${RAW_DIR}`);
    process.exit(1);
  }
  const sources = files.map((filename) => {
    const raw = fs.readFileSync(path.join(RAW_DIR, filename), "utf8");
    const { data, content } = matter(raw);
    return {
      filename,
      title:   data.title   || filename.replace(".md", ""),
      source:  data.source  || "",
      tags:    Array.isArray(data.tags) ? data.tags : [],
      clipped: data.created || "",
      content: content.trim(),
    };
  });
  console.log(`Found ${sources.length} source files in raw/${domain}/`);
  return sources;
}

function ensureWikiDir() {
  // Clear before write: stale concept articles from previous runs would
  // otherwise linger as duplicates when concept_ids shift between runs.
  fs.rmSync(WIKI_DIR, { recursive: true, force: true });
  fs.mkdirSync(WIKI_DIR, { recursive: true });
}

function writeWikiFile(filename, content) {
  fs.writeFileSync(path.join(WIKI_DIR, filename), content, "utf8");
  console.log(`Written wiki/${domain}/${filename}`);
}

async function callSonnet(system, user, maxTokens = 8192) {
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content[0].text;
}

async function callHaiku(user) {
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: user }],
  });
  return res.content[0].text.trim();
}

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function paraguayTimestamp() {
  return new Date().toLocaleString("es-PY", { timeZone: "America/Asuncion" });
}

// ─── STEP 2 — EXTRACT CONCEPTS ────────────────────────────────────────────────

async function extractConcepts(sources) {
  console.log("\nExtracting concepts...");

  const combined = sources
    .map((s) => `=== ARCHIVO: ${s.filename} ===\nTÍTULO: ${s.title}\n\n${s.content.slice(0, 8000)}`)
    .join("\n\n---\n\n");

  const raw = await callSonnet(
    `Eres un asistente académico especializado en historia cultural latinoamericana, dictaduras del siglo XX y resistencia cultural en Paraguay.`,
    `Analiza los siguientes documentos de investigación para una tesis doctoral sobre la resistencia cultural bajo la dictadura de Stroessner en Paraguay (1954-1989). El caso central es el Teatro Estudio Libre, el Festival Mandu'arã y la figura de Rudi Torga.

Identifica entre 8 y 15 conceptos clave que aparezcan o sean relevantes para este dominio de investigación.

Para cada concepto devuelve:
- concept_id: identificador en snake_case sin acentos
- title: título legible en español
- description: descripción de 2-3 oraciones
- appears_in: array de filenames donde aparece
- related_concepts: array de concept_ids relacionados

Responde SOLO con JSON válido. Sin markdown.
Schema: { "concepts": [{ "concept_id": "", "title": "", "description": "", "appears_in": [], "related_concepts": [] }] }

DOCUMENTOS:
${combined}`
  );

  let concepts;
  try {
    concepts = JSON.parse(raw.replace(/```json|```/g, "").trim()).concepts;
  } catch (e) {
    console.error("ERROR: Failed to parse concepts JSON.");
    console.error("Raw response (first 500 chars):", raw.slice(0, 500));
    process.exit(1);
  }

  console.log(`Identified ${concepts.length} concepts`);
  return concepts;
}

// ─── STEP 3 — WRITE CONCEPT ARTICLES ─────────────────────────────────────────

async function writeConceptArticles(concepts, sources) {
  console.log("\nWriting concept articles...");

  for (const concept of concepts) {
    const relevant = sources.filter((s) => concept.appears_in.includes(s.filename));

    const sourceLinks = relevant.length
      ? relevant.map((s) => `- [${s.title}](${s.source || s.filename})`).join("\n")
      : "*(sin fuentes directas)*";

    const relatedLinks = concept.related_concepts.length
      ? concept.related_concepts.map((id) => {
          const r = concepts.find((c) => c.concept_id === id);
          return r ? `- [[${id}|${r.title}]]` : `- [[${id}]]`;
        }).join("\n")
      : "*(sin artículos relacionados)*";

    const sourceBlock = relevant.map((s) =>
      `=== ${s.title} (${s.filename}) ===\n${s.content}`
    ).join("\n\n---\n\n") || "*(sin fuentes directas para este concepto)*";

    const article = await callSonnet(
      `Eres un asistente académico que escribe artículos de wiki para una tesis doctoral sobre resistencia cultural bajo la dictadura de Stroessner en Paraguay. Escribes en español académico. Solo usas los documentos fuente proporcionados. No inventas hechos.`,
      `Escribe un artículo de wiki en español sobre el siguiente concepto.

CONCEPTO: ${concept.title}
DESCRIPCIÓN: ${concept.description}

Estructura EXACTA:

## ${concept.title}

[2-3 párrafos de exposición basados en las fuentes]

### Relevancia para la investigación

[1 párrafo sobre importancia para la tesis sobre Teatro Estudio Libre / Mandu'arã / Rudi Torga]

### Fuentes

${sourceLinks}

### Ver también

${relatedLinks}

---
*Compilado por Renegade OS — ${todayDate()}*

DOCUMENTOS FUENTE:
${sourceBlock}`
    );

    writeWikiFile(`${concept.concept_id}.md`, article);
  }
}

// ─── STEP 4 — WRITE INDEX.md ──────────────────────────────────────────────────

async function writeIndex(concepts, sources) {
  console.log("\nGenerating INDEX.md...");

  const conceptList = concepts
    .map((c) => `- [[${c.concept_id}|${c.title}]] — ${c.description}`)
    .join("\n");

  const connectionMap = concepts
    .filter((c) => c.related_concepts.length > 0)
    .map((c) => {
      const links = c.related_concepts.map((id) => {
        const r = concepts.find((x) => x.concept_id === id);
        return r ? `[[${id}|${r.title}]]` : `[[${id}]]`;
      }).join(", ");
      return `**${c.title}** → ${links}`;
    }).join("\n");

  const sourcePreview = sources.map((s) => s.content).join("\n\n").slice(0, 6000);

  const questions = await callSonnet(
    "Eres un director de tesis doctoral especializado en historia cultural latinoamericana.",
    `Sugiere 5 preguntas de investigación específicas para capítulos de una tesis doctoral sobre el Teatro Estudio Libre y la resistencia cultural bajo Stroessner. Específicas, investigables, español académico. Solo las 5 numeradas, sin introducción.

CONCEPTOS:
${concepts.map((c) => `- ${c.title}: ${c.description}`).join("\n")}

EXTRACTO DE FUENTES:
${sourcePreview}`
  );

  const quickLinks = concepts.map((c) => `- [[${c.concept_id}|${c.title}]]`).join("\n");

  const index = `# Wiki de Investigación — PhD
*Última compilación: ${paraguayTimestamp()}*
*Fuentes: ${sources.length} documentos | Conceptos: ${concepts.length} artículos*

---

## Conceptos principales

${conceptList}

---

## Mapa de conexiones

${connectionMap || "*(conexiones pendientes)*"}

---

## Preguntas de investigación sugeridas

${questions}

---

## Acceso rápido

- [[SOURCES|Fuentes completas]]
${quickLinks}

---
*Generado por Renegade OS compile-wiki.js*
`;

  writeWikiFile("INDEX.md", index);
}

// ─── STEP 5 — WRITE SOURCES.md ────────────────────────────────────────────────

async function writeSources(concepts, sources) {
  console.log("\nGenerating SOURCES.md...");

  const entries = [];
  for (const s of sources) {
    const summary = await callHaiku(
      `Resume en 2 oraciones en español este artículo. Solo los hechos más importantes. Sin introducción.\nTÍTULO: ${s.title}\nCONTENIDO: ${s.content.slice(0, 3000)}`
    );
    const covered = concepts
      .filter((c) => c.appears_in.includes(s.filename))
      .map((c) => c.title).join(", ");

    entries.push(
      `## ${s.title}\n` +
      `- **URL:** ${s.source ? `[${s.source}](${s.source})` : "*(sin URL)*"}\n` +
      `- **Capturado:** ${s.clipped || "*(sin fecha)*"}\n` +
      `- **Tags:** ${s.tags.join(", ") || "*(sin tags)*"}\n` +
      `- **Conceptos cubiertos:** ${covered || "*(sin clasificar)*"}\n` +
      `- **Resumen:** ${summary}`
    );
  }

  const sourcesFile =
    `# Fuentes — raw/${domain}/\n` +
    `*${sources.length} documentos — ${paraguayTimestamp()}*\n\n---\n\n` +
    entries.join("\n\n---\n\n") +
    `\n\n---\n*Generado por Renegade OS compile-wiki.js*\n`;

  writeWikiFile("SOURCES.md", sourcesFile);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  RENEGADE OS — Wiki Compiler");
  console.log(`  Domain: ${domain}`);
  console.log("═══════════════════════════════════════");
  console.log(`Vault:  ${VAULT_BASE}`);
  console.log(`Input:  raw/${domain}/`);
  console.log(`Output: wiki/${domain}/\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY not set. Check .env.local");
    process.exit(1);
  }

  const sources  = readSources();
  const concepts = await extractConcepts(sources);
  // Clear only after extraction succeeds, so a failed run can't wipe the wiki
  ensureWikiDir();
  await writeConceptArticles(concepts, sources);
  await writeIndex(concepts, sources);
  await writeSources(concepts, sources);

  console.log("\n═══════════════════════════════════════");
  console.log("  Done. Open INDEX.md in Obsidian.");
  console.log("═══════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
