# Renegade OS — System Architecture

*Last updated: June 10, 2026*

## 1. What it is

Renegade OS is a personal executive operating system for René Ruiz Díaz: a password-gated web application where seven AI agents — each owning one professional domain — read from and write to a single source of truth describing his projects, decisions, opportunities, commitments, and contacts. It generates a daily external-intelligence brief, an on-demand morning briefing, and captures session notes automatically. It is a single-user system today, designed with a future commercial SaaS in mind.

The seven domains: **Capital Markets** (Avalon, advisory mandates), **Newco** (digital-asset venture with Banco Continental Group), **Sudestada** (real-estate structuring and cross-border advisory), **Film & Creative**, **Media**, **PhD/Research**, and **Personal**. A **Chief of Staff** agent sits above all of them with cross-domain visibility.

## 2. Stack and hosting

| Layer | Technology | Where it lives |
|---|---|---|
| Application | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4 | Vercel — `renegadeos.vercel.app`, served at **renegade.reneruizdiaz.com** |
| Source code | Git monorepo | GitHub — `github.com/reneruizdiaz/renegadeos` (`main` auto-deploys to Vercel) |
| Data (system of record) | Seven JSON files | **Google Drive folder `renegade-os-data`** in René's personal Drive (also synced to his Mac via Drive for desktop) |
| AI | Anthropic API — Claude Sonnet 4.6 (chat, briefing, synthesis) and Claude Haiku 4.5 (summaries, session notes) | API calls from Vercel functions and local scripts |
| Research vault | Markdown files (Obsidian-compatible) | `~/renegade-wiki/` on René's Mac (`raw/<domain>/` sources → `wiki/<domain>/` compiled articles) |
| Scheduled jobs | Vercel Cron | `GET /api/cron/daily-brief`, daily at 10:00 UTC (~07:00 Asunción) |

There is no database. Google Drive JSON files are the persistence layer, accessed through a Google Cloud **service account** (`renegade-os-drive@renegade-os-492912.iam.gserviceaccount.com`) that has Editor access to the data folder.

## 3. Data layer

All entities live in JSON arrays, one file each, in the Drive folder:

| File | Entity | ID scheme | Notes |
|---|---|---|---|
| `projects.json` | Projects (27) | `P-001`… | name, domain, agent, status, priority, milestone, last/next action + dates, notes, `updated_at` |
| `decisions.json` | Decision log (10) | `D-001`… | Append-only. STANDING / SUPERSEDED with `superseded_by` |
| `opportunities.json` | Pipeline | `O-001`… | LIVE / QUALIFIED / DORMANT / PASSED / CLOSED_WON / CLOSED_LOST |
| `commitments.json` | Promises made | `C-…` | OPEN / DELIVERED / MISSED / CANCELLED |
| `contacts.json` | Relationships | — | domain-tagged, relationship temperature |
| `sessions.json` | Conversation notes | `sess-…` / `auto-…` | written by agents, mostly automatically |
| `changelog.json` | Audit trail | — | one entry per agent write: timestamp, agent, tool, target id, field-level diff |
| `daily-brief.json` | Latest intelligence brief | — | overwritten daily by the cron |
| `watchlist.json` | Intelligence sources | — | RSS / Google News / YouTube / Substack entries with domain + rationale |

Project statuses: `ACTIVE, WATCH, STALLED, ON_HOLD, DORMANT, CLOSED, SOMEDAY`. Priorities: `P1–P3`. TypeScript types for every entity are in `lib/schema.ts`; `lib/drive.ts` is the only module that touches Drive (googleapis v3, find-by-name inside the folder, read via `alt=media`, write via `files.update`).

**Key constraint:** service accounts have no storage quota in a personal Drive, so the SA can *update* files but never *create* them. New files are created once by the owner (manually or via Drive API as René), then updated programmatically forever after.

## 4. The agents

`lib/agents.ts` defines seven agent configs (id, display name, domain, system prompt, starter prompts). Each domain agent has a page at `/agents/<id>`; the Chief of Staff lives on the home page.

Every chat request (`POST /api/chat`) assembles a **live context block** (`lib/context.ts`): the agent's domain-filtered projects, standing decisions, and active opportunities, read fresh from Drive. The Chief of Staff sees all domains, with a briefing filter (decision D-010): **all P1 projects plus anything with a next action due within 14 days are shown in full; everything else collapses to a one-line count per domain.**

`lib/cost-router.ts` routes task types to models: real-time chat and briefings use Sonnet with prompt caching (`cache_control: ephemeral` on system prompt and context block); summaries and extractions use Haiku.

## 5. Write path — conversational CRUD

Renegade OS is the **system of record** (decision D-009): changes are made by telling an agent, not by editing JSON.

`lib/tools.ts` defines five Anthropic tool-use tools available to every agent in `/api/chat`:

- `update_project`, `create_project`, `update_opportunity`, `log_decision`, `log_session_note`

The chat route runs a streaming tool loop: model streams text → if it requests tools, the server executes the batch against Drive, feeds results back, and the model confirms the change in plain language ("Costa Food marked ON_HOLD").

**Guardrails (enforced server-side):**
- No deletions, ever — closing means `status: CLOSED`.
- Required fields cannot be emptied by an update.
- Field values validated against schema enums; unknown IDs rejected with the list of valid ones.
- **One write batch per user message** — further tool calls in the same turn are refused.
- Every successful write sets `updated_at` and appends a field-level diff to `changelog.json`.
- If the reply stream fails *after* a write succeeded, the executed change is still flushed to the client ("✓ Saved to Drive…") so a transient error can never hide a persisted write.

**Automatic session capture:** once a conversation passes four user messages, every subsequent exchange upserts a Haiku-generated 3-line session note into `sessions.json`, keyed by a per-conversation UUID. The last upsert is the de-facto end-of-session note — no one has to remember to save.

## 6. Intelligence pipeline

Daily at 10:00 UTC, Vercel Cron calls `/api/cron/daily-brief` (auth: `Bearer CRON_SECRET`):

1. Reads `watchlist.json` from Drive (active entries only).
2. Fetches each source (Google News RSS by query, or direct RSS for YouTube/Substack), parses items.
3. Haiku summarizes each source's items in Spanish ("SIN NOVEDAD" if nothing relevant).
4. Sonnet synthesizes the **coffee brief** — one conversational paragraph addressed to René — plus an optional **señal del día**.
5. Writes `daily-brief.json` to Drive.

**Failure policy:** synthesis retries once; if it fails again, a visible "⚠️ FALLO DE SÍNTESIS" marker with the actual error is written into the payload (`synthesis_error` field) — silent degradation is prohibited. Per-source signal data is preserved regardless.

The home page renders this via `GET /api/daily-brief` + the `IntelligenceFeed` component: coffee brief (red-bordered when synthesis failed), señal del día, and collapsible per-domain signal sections with article links. The same data is appended to the Chief of Staff's morning-briefing context, so the on-demand briefing (`POST /api/briefing`, streamed) can cross-reference external news with internal projects.

A separate local script, `scripts/compile-wiki.js` (`npm run wiki`), compiles the PhD research vault: reads `~/renegade-wiki/raw/phd/*.md` (excluding `news/` clippings), extracts concepts with Sonnet, writes one wiki article per concept plus `INDEX.md` and `SOURCES.md` into `~/renegade-wiki/wiki/phd/`, clearing the output directory first (only after extraction succeeds, so a failed run can't destroy the existing wiki).

## 7. Auth and security

- **Single password gate.** `proxy.ts` (Next.js middleware) checks a `renegade_auth` cookie against the `RENEGADE_PASSWORD` env var on every route except `/login`, `/api/auth/login`, `/api/cron/*` (which uses the cron secret instead), and static assets.
- **Secrets** live in Vercel environment variables (`GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_DRIVE_FOLDER_ID`, `ANTHROPIC_API_KEY`, `RENEGADE_PASSWORD`, `CRON_SECRET`), pulled locally to `.env.local` (git-ignored). The Anthropic key never reaches the client — `/api/usage` proxies usage queries server-side.
- **Rate limiting:** in-memory, 20 chat requests/minute per IP.
- **Auditability:** every agent write is in `changelog.json`; git history covers all code and the committed pre-refresh data backups.

## 8. Repository layout

```
renegade-os/
├── app/
│   ├── page.tsx                  # Home: domain cards, intelligence feed, briefing, sessions, CoS chat
│   ├── login/                    # Password gate UI
│   ├── agents/<domain>/          # Six domain agent pages
│   └── api/
│       ├── chat/                 # Agent chat: streaming + tool loop + auto session capture
│       ├── briefing/             # On-demand morning briefing (streamed)
│       ├── daily-brief/          # Serves latest intelligence brief
│       ├── cron/daily-brief/     # Scheduled intelligence pipeline
│       ├── auth/login/           # Sets auth cookie
│       ├── context/, projects/, session/, usage/
├── components/                   # AgentChat, IntelligenceFeed, BriefingCard, DomainNav, UsageCard…
├── lib/
│   ├── schema.ts                 # Entity types (single source of type truth)
│   ├── drive.ts                  # Google Drive I/O
│   ├── agents.ts                 # Agent registry + system prompts
│   ├── context.ts                # Context assembly + briefing filter
│   ├── tools.ts                  # Write tools, validation, changelog
│   └── cost-router.ts            # Model routing + caching policy
├── scripts/                      # compile-wiki.js, daily-brief.js (local), one-time data migrations
├── docs/                         # This file + sprint handoffs
├── proxy.ts                      # Auth middleware
└── vercel.json                   # Function timeouts + cron schedule
```

## 9. Operational notes

- Deploys are git-push-driven: merge to `main` → Vercel builds (TypeScript check is part of the build) → live.
- The data folder is doubly accessible: via API (service account) for the app, and via Drive sync on René's Mac for inspection.
- Costs are controlled by model routing (Haiku for high-volume summarization), prompt caching on chat, and the one-write-batch cap. A `UsageCard` in the UI shows live API spend.
- Known failure mode: if the Anthropic account runs out of credits, chat/briefing return errors and the daily brief shows the visible synthesis-failure marker — data reads, the intelligence feed, and all Drive content remain intact.
