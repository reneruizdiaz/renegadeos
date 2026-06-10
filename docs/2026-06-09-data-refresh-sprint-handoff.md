# RENEGADE OS — DATA REFRESH + SPRINT HANDOFF
Date: June 9, 2026. Source: architecture chat with Claude. Owner: René.

## INSTRUCTIONS FOR CLAUDE CODE

Execute in this order. Do not skip the verification steps.

### Task 1 — Write refreshed data to Drive (~20 min)

1. Read the current projects.json from Drive and note its exact field schema. The JSON below uses a canonical schema; adapt field names to match what exists in Drive. Do not invent new fields except `note` if absent.
2. Match existing projects by name. Keep their existing IDs. Assign new IDs sequentially (P-014 onward) for entries not currently in Drive.
3. Set `updated_at` to 2026-06-09 on every record you touch.
4. Statuses marked CONFIRM_IN_APP are placeholders René will resolve once Task 3 ships. Write them as ON_HOLD with the note preserved.
5. Update opportunities.json: set O-001 (USD 6-7M advisory lead) to DORMANT with note "Revisit Q3 2026."
6. Append the five decision records below to decisions.json.
7. Verification: re-read all three files from Drive after writing and print record counts and the three nearest next_action_date values. Then call the briefing endpoint once and confirm the new data surfaces.

### Task 2 — compile-wiki fixes (~10 min)

1. Add clear-before-write: remove and recreate the target wiki/<domain> output directory at the start of each run.
2. Exclude `raw/<domain>/news/` from the source glob. Daily-brief news clippings are not wiki source material.
3. Verification: run compile-wiki on phd and confirm 15 concepts + INDEX + SOURCES, no duplicates, news files untouched.

### Task 3 — SPRINT A: Conversational CRUD (the new priority, ~3-4 hrs)

Decision from René: Renegade OS is now the system of record for project updates and edits. Build a write path through the agents.

1. Define Anthropic tool-use tools in the chat API route: `update_project`, `create_project`, `update_opportunity`, `log_decision`, `log_session_note`. Each tool validates against the Drive schema, sets `updated_at`, and appends a one-line entry to a new `changelog.json` (timestamp, agent, field-level diff).
2. Wire tools into /api/chat so any agent can execute them mid-conversation. The agent must confirm the change back to René in the reply ("Costa Food marked ON_HOLD").
3. Guardrails: never delete records (status CLOSED instead); reject writes that drop required fields; cap one write batch per message.
4. Auto-session capture: on every agent conversation longer than 4 user messages, automatically call `log_session_note` with a 3-line summary at conversation end. sessions.json has been empty since launch because manual save never happened. Remove the dependency on memory.
5. Briefing filter rule: modify Chief of Staff context assembly to surface only (a) all P1 projects and (b) any project with next_action_date within 14 days. Collapse everything else to a one-line count per domain. 27 projects in a flat list will drown the briefing.
6. Verification: from the deployed app, send "mark Costa Food as on hold" to the Capital Markets agent. Confirm Drive reflects it, changelog has the diff, and the next briefing shows it.

### Task 4 — Coffee-brief error visibility (~30 min)

The cron's catch block swallows synthesis failures (today's brief ran with coffee_brief and signal_of_day null, silently). On failure: retry once; if it fails again, write a visible failure marker string into the brief payload and log the actual error. Silent degradation is prohibited.

### Task 5 — Intelligence feed UI (separate sprint, ~2-3 hrs)

Render daily-brief.json (coffee brief, signal of day, per-domain entries) on the home page. Schedule after Sprint A.

---

## REFRESHED DATA

### projects.json (27 records)

```json
[
  {"name": "Costa Food", "domain": "CAPITAL_MARKETS", "status": "ON_HOLD", "priority": "P2", "milestone": "Pending client definition", "next_action": "Await client scope definition", "next_action_date": null, "note": "Reactivate when client defines scope"},
  {"name": "Continental share dematerialization", "domain": "CAPITAL_MARKETS", "status": "CLOSED", "priority": "P2", "milestone": "Completed. First leading listed company on BVPASA at 100% dematerialized. Avalon advisor and custodian", "next_action": "None. Media follow-up tracked under MEDIA", "next_action_date": null},
  {"name": "IMF BCP de-dollarization engagement", "domain": "CAPITAL_MARKETS", "status": "ACTIVE", "priority": "P2", "milestone": "June 2026 macroprudential mission meeting held at BCP", "next_action": "Follow up with BCP and Superintendencia on five-pillar framework positioning", "next_action_date": "2026-06-20"},
  {"name": "AZPA Petroquim Monteverde M&A", "domain": "CAPITAL_MARKETS", "status": "ACTIVE", "priority": "P1", "milestone": "Representing CE and GCM vs ALPAX/Hoeckle, approx USD 75.9M per investor", "next_action": "Confirm current negotiation step in app", "next_action_date": "2026-06-16"},
  {"name": "CFO As A Service (Coopeduc anchor)", "domain": "CAPITAL_MARKETS", "status": "ON_HOLD", "priority": "P2", "milestone": "Launched with Coopeduc as anchor client", "next_action": "CONFIRM_IN_APP: current status unknown", "next_action_date": null},
  {"name": "Newco MVP", "domain": "NEWCO", "status": "ACTIVE", "priority": "P1", "milestone": "July 31 hard deadline. Anchored to Lirium Step 1: manual OTC plus white-label dashboard under Lirium license", "next_action": "Weekly MVP checkpoint with Lirium", "next_action_date": "2026-06-13"},
  {"name": "Aurum Tech S.A. operationalization", "domain": "NEWCO", "status": "ACTIVE", "priority": "P1", "milestone": "Incorporated 2026-05-13. Altieri Director Presidente, Sofia Espinola Harms Director Titular", "next_action": "Confirm operating setup: banking, compliance, signatures", "next_action_date": "2026-06-20"},
  {"name": "Newco vendor decisions", "domain": "NEWCO", "status": "ACTIVE", "priority": "P1", "milestone": "Open: G-Payments USD 80K vs Mastercard USD 235K scope overlap; Walkers VASP registration vs full license fork", "next_action": "Resolve scope overlap and license fork with Maxi", "next_action_date": "2026-06-20"},
  {"name": "Newco CEO search", "domain": "NEWCO", "status": "ACTIVE", "priority": "P2", "milestone": "GROW Solutions proposal received 2026-05-25", "next_action": "Respond to GROW proposal", "next_action_date": "2026-06-20"},
  {"name": "Citi tokenization conversations", "domain": "NEWCO", "status": "ACTIVE", "priority": "P2", "milestone": "Exploratory, en curso", "next_action": "Schedule next touchpoint", "next_action_date": null},
  {"name": "Advisory lead USD 6-7M", "domain": "SUDESTADA", "status": "DORMANT", "priority": "P3", "milestone": "Qualified, then went quiet", "next_action": "Revisit", "next_action_date": "2026-09-01"},
  {"name": "Complejo Barrail", "domain": "SUDESTADA", "status": "ACTIVE", "priority": "P1", "milestone": "USD 267M mixed-use Asuncion. Phased capital stack proposed: land as equity, staged construction debt, fideicomiso refinancing", "next_action": "Dinner with Barrail family and investor contact", "next_action_date": "2026-06-15"},
  {"name": "Gonzales Acosta multifamily program", "domain": "SUDESTADA", "status": "ACTIVE", "priority": "P1", "milestone": "10 sequential buildings approx USD 2M each. Conveyor-belt fideicomiso structure designed", "next_action": "Present structure to VGA", "next_action_date": "2026-06-30"},
  {"name": "Paraguay Flash", "domain": "SUDESTADA", "status": "ON_HOLD", "priority": "P2", "milestone": "Architecture defined: Lane A neutral entity, Gilda director, family roles assigned", "next_action": "CONFIRM_IN_APP: activation status unknown", "next_action_date": null},
  {"name": "Spanish SL incorporation", "domain": "SUDESTADA", "status": "ACTIVE", "priority": "P2", "milestone": "Tied to July Spain trip. Basque film tax incentives under evaluation", "next_action": "Pre-trip checklist: advisors, structure, banking", "next_action_date": "2026-06-30"},
  {"name": "Maldecidos", "domain": "FILM", "status": "ACTIVE", "priority": "P1", "milestone": "Principal photography August 2026. Hugo Cardozo directing, Gonzalo line producer. Budget approx USD 200K. Actor contracts drafted. DP hire delegated to Hugo at USD 6.5K anchor", "next_action": "Close DP hire and collect cast signatures", "next_action_date": "2026-06-20"},
  {"name": "Influencer por Accidente: INAP submission", "domain": "FILM", "status": "ACTIVE", "priority": "P1", "milestone": "INAP Fondos Concursables deadline 2026-06-26. Samuel Cardozo directing", "next_action": "Close gaps: distribution plan, equipment list, DINAPI title-page field", "next_action_date": "2026-06-16"},
  {"name": "Influencer por Accidente: investor page", "domain": "FILM", "status": "ACTIVE", "priority": "P2", "milestone": "Sponsor version live in repo. Investor variant pending", "next_action": "Define deal terms: raise amount, instrument, recoupment waterfall", "next_action_date": "2026-06-20"},
  {"name": "KH talent management S.A.", "domain": "FILM", "status": "ACTIVE", "priority": "P1", "milestone": "Term sheet final: 80/20 with growth-triggered ratchet capped at parity", "next_action": "Present to KH. Open items: client portfolio treatment, dividend threshold", "next_action_date": "2026-06-20"},
  {"name": "Morbido / Cannes Fantastic Pavilion", "domain": "FILM", "status": "ACTIVE", "priority": "P2", "milestone": "Mutual NDA executed with all three clarifications incorporated", "next_action": "Define cooperation scope with Pablo Guisa", "next_action_date": "2026-06-30"},
  {"name": "Spanish production company branding", "domain": "FILM", "status": "ACTIVE", "priority": "P2", "milestone": "Naming shortlist developed, Pytu as lead candidate", "next_action": "Verify .es domain availability, lock name", "next_action_date": "2026-06-20"},
  {"name": "Tutorial (short film)", "domain": "FILM", "status": "ACTIVE", "priority": "P3", "milestone": "Production-ready script delivered. Cast: Fabi, Santi, Mahiara", "next_action": "Schedule shoot night", "next_action_date": "2026-06-30"},
  {"name": "La Sucursal del Cielo", "domain": "FILM", "status": "ON_HOLD", "priority": "P3", "milestone": "Pitch deck v3 delivered", "next_action": "Await counterpart response", "next_action_date": null},
  {"name": "Academia de Cine candidacy", "domain": "FILM", "status": "ACTIVE", "priority": "P2", "milestone": "Declared candidate", "next_action": "CONFIRM_IN_APP: define next milestone", "next_action_date": null},
  {"name": "IFI: Continental episode", "domain": "MEDIA", "status": "ACTIVE", "priority": "P1", "milestone": "Interview guide ready. Guests: Teresa Gaona and Rodrigo Ortiz (Banco Continental directors)", "next_action": "Confirm recording date", "next_action_date": "2026-06-13"},
  {"name": "PhD UNA", "domain": "PHD", "status": "ACTIVE", "priority": "P2", "milestone": "Wiki compiled: 15 concepts. Rudi Torga / Teatro Estudio Libre focus", "next_action": "Define next research move", "next_action_date": "2026-06-30"},
  {"name": "Spain trip (July)", "domain": "PERSONAL", "status": "ACTIVE", "priority": "P1", "milestone": "Bilbao, San Sebastian, Madrid. Dual purpose: leisure plus business development", "next_action": "Lock meeting calendar: Film Basque Country, Pokeepsie Films, Tornasol", "next_action_date": "2026-06-25"}
]
```

### decisions.json — append these five records

```json
[
  {"domain": "NEWCO", "date": "2026-06-09", "decision": "July 31 MVP anchored to Lirium Step 1 (manual OTC plus white-label dashboard) as the only timeline-compatible deliverable"},
  {"domain": "SUDESTADA", "date": "2026-06-09", "decision": "USD 6-7M advisory lead classified DORMANT, revisit Q3 2026"},
  {"domain": "FILM", "date": "2026-06-09", "decision": "KH partnership structured as 80/20 with growth-triggered equity ratchet capped at parity"},
  {"domain": "ALL", "date": "2026-06-09", "decision": "Renegade OS becomes system of record for project updates and edits. Conversational CRUD via agent tool use replaces chat interviews and manual JSON edits"},
  {"domain": "ALL", "date": "2026-06-09", "decision": "Briefing filter rule: surface all P1s plus anything with next_action_date within 14 days. Collapse the rest to per-domain counts"}
]
```

### opportunities.json

Update O-001 (USD 6-7M advisory lead): status DORMANT, note "Revisit Q3 2026." New opportunity intake happens in-app via create tooling once Task 3 ships.

---

## OPEN ITEMS FOR RENÉ (resolve in-app after Sprint A ships)

1. CFO As A Service: current status
2. Paraguay Flash: activation status
3. Academia de Cine: next milestone
4. Any opportunities from the last 8 weeks not captured above
