# Mission Brief — viome-meals-v1-build

Extracted from `Viome_Meals_PRD.md` rev 3 (2026-07-05) on 2026-07-06. Every field below is
grounded in the PRD, `CLAUDE.md`, or `Resume_from_20260705_2118.md` unless marked
`(NEEDS INPUT: ...)`. Timing note: this brief is extracted **pre-markup** — Kurt has not yet
marked up rev 3. Scoring defaults (§4) and the Next.js + TypeScript stack (§6.1) are proposals,
not settled. The wargame should treat them as the plan of record while flagging where a markup
reversal would change the battle plan.

**Mission:** Build and deploy v1 of Viome Meals — a personal web app that generates dinner
ideas both Kurt and Cyndi can eat by reconciling their two Viome microbiome food profiles: live
LLM recipe generation steered by both profiles, with all scoring (per-ingredient color coding,
weakest-link Both Score, Avoid/hard-rule blocking) computed deterministically in code. Why now:
the PRD is at rev 3 with the two-round Codex review cycle closed; markup → agreement →
`git init` → build is the declared next sequence.

**Executor model:** Fable 5 in Claude Code (confirmed by Kurt, 2026-07-06) — the wargame
tunes counter-moves to Claude Code's agentic build loop and Fable-class strengths/failure
modes.

**Spec draft location:** `(not included) Viome_Meals_PRD.md` (rev 3)

**Users / audience:** Kurt and Cyndi — one household, exactly two users in v1 (invite-only;
public signups disabled). State of mind at use: deciding a real dinner, time-pressed, typing
freeform steering ("something with salmon, quick, no oven") and expecting ~3 idea cards in a
few seconds. They trust the color coding implicitly — a wrong "safe" rating is the worst
failure class (PRD §1.1: zero served Avoid/hard-rule violations). Secondary future audience:
a conversational agent as client #2 of the same service layer (§5.7) — out of v1 but the
API-first shape must survive it.

**Definition of done** (observable outcomes, from PRD §1.1, §4, §5, §6.5):

1. App deployed on Vercel; Kurt and Cyndi sign in via Google OAuth; no public-signup path
   exists.
2. Both profiles' food-ratings CSVs imported as `complete` snapshots; health-score,
   microbe, and gene-expression extracts from the Results/Recommendations PDFs stored
   (append-only, not surfaced in UI).
3. Steering text returns ~3 idea cards in a few seconds, each with verified key ingredients
   and a provisional Both Score; Avoid/hard-rule conflicts on a card are flagged
   ("contains lime — Avoid for Kurt; needs substitution"), never suppressed and never
   silently served.
4. Tapping a card returns a full structured recipe with per-ingredient, per-person color
   coding computed in code from the stored tables; Both Score = `0.75·min + 0.25·mean`
   (default pending markup); coverage lines shown ("Based on N personalized ingredients").
5. A recipe with either person's Avoid or any hard-rule violation is `blocked`: never
   presented as cookable, never saveable; substitutions are LLM-proposed and code-verified
   before display.
6. Save to Our Recipes works with server-side re-score gate; library search/filter/sort
   works; scores recompute on read (never stored).
7. The §6.5 acceptance test passes: an authenticated non-member of a household cannot read
   its data, write its data, obtain signed URLs to its files, or trigger an Anthropic call
   on its behalf. No unauthenticated request ever reaches the Anthropic API.
8. RLS active on every table (the two seeded global reference tables read-only to
   authenticated users, no client writes).
9. Prompt caching demonstrably works: unchanged profiles/rules/staples produce
   byte-identical prefixes and cache hits on consecutive calls.

**Verification the executor must perform before reporting done:**

- Run the §6.5 acceptance test end-to-end (second authenticated test user outside the
  household).
- Score known conflict foods against the **actual CSVs**, never memory: kimchi
  (Superfood Kurt / Minimize Cyndi), lime (Avoid Kurt / Superfood Cyndi), onion
  (Minimize Kurt / Avoid Cyndi), beef-lean (Enjoy Kurt / Avoid Cyndi) — deterministic
  results must match the tables.
- Verify the asymmetric-vocabulary rule: "Cane Sugar" (Cyndi-only) scores Unrated for
  Kurt, never assumed.
- Verify vocabulary quirks survive import round-trip verbatim (`"Adzuki Beans "` trailing
  space; `"Green Onion (greens only)"`) and exact-string matching still verifies them.
- Attempt to save a `blocked` and an `insufficient_data` recipe → both rejected
  server-side.
- Verify fail-closed: a matched ingredient with no reviewed `food_attributes` record is
  treated as violating every attribute-based hard rule in the household.
- Verify import lifecycle: an induced mid-import failure leaves the import `failed` and
  never eligible as current; prior complete import remains current.
- Exercise every §5.7 service function at least once, including rejection paths
  (unauthenticated, non-member).
- Confirm cache behavior via API usage metrics: two consecutive generations with unchanged
  profiles hit the cache; a staples edit produces exactly one miss then re-caches.
- Confirm Stage 1 latency lands in the "few seconds" band.

**Known constraints:**

- **Stack (settled):** Vercel (app + serverless functions holding the Anthropic key) +
  Supabase Pro (Postgres, Auth, Storage) + Anthropic API. No self-hosting of any kind.
- **Stack (proposal, pending markup):** Next.js App Router + TypeScript, Supabase JS
  client, Anthropic TypeScript SDK.
- **LLM:** Opus 4.8 (`claude-opus-4-8`); model ID and per-stage effort are config values.
  Prompt caching is a design requirement (one `cache_control` breakpoint, byte-stable
  prefix rebuilt from DB per request); prompt templates live in code, not the DB.
- **Cost is a non-factor** (~$2–4/month expected); **latency is the binding constraint**
  (Stage 1 idea cards).
- **External dependencies not yet done** (PRD §10, owner Kurt): Anthropic Console account +
  billing; Vercel signup completion; Google Cloud OAuth consent screen + keys into
  Supabase. The executor is blocked on these for deploy/auth/LLM work.
- **Human-in-the-loop gates mid-build:** `food_attributes` seed data over the ~400-food
  vocabulary must be human-reviewed (safety-adjacent — hard rules depend on it); profile
  rules content (allergies, hard rules, dislikes) is supplied by Kurt & Cyndi at profile
  setup, not available during build.
- **Process gates:** Kurt's markup of rev 3 and PRD agreement precede build; `git init`
  lands with the agreed PRD (folder is not yet a repo). The Codex review cycle is closed —
  no further Codex rounds.
- **Owner profile:** Kurt codes for visual confirmation (Python-medium, LLM-assisted);
  the build will be LLM-executed with Kurt reviewing. TypeScript/Next.js is not his home
  stack.
- No deadline stated — quality and safety gates outrank speed.

**Known risks going in** (confirmed by Kurt, 2026-07-06):

1. **`food_attributes` rubber-stamp** — human review of ~400 foods' attributes is tedious
   and safety-critical; risk of approving without really looking. Hard rules depend on
   this data.
2. **Pre-markup spec shift** — this wargame runs against rev 3 before Kurt's markup;
   scoring defaults (§4) or the stack (§6.1) could change after, invalidating parts of
   the battle plan.

Claude-observed candidates Kurt reviewed and did **not** elevate (keep as background, not
headline risks): PDF extraction of health scores/microbes/genes is unspecified and may
parse messily; the build is TypeScript/Next.js while Kurt's review depth is Python.

**Out of scope** (PRD §8 — the wargame should treat any drift toward these as a failure
mode to catch, not a fork to explore):

- Pantry inventory tracking in any disguise, including leftovers tracking.
- Pre-generated recipe library; model self-grading of any kind.
- Self-hosting / Mac Mini deployment, even as a migration path.
- Viome API integration (none exists; CSV/PDF import is the interface).
- v1 exclusions: recipe photos, grocery-list features, recipe variants/Compare tabs,
  import UI, native mobile apps, multi-household onboarding flows, health-score display.
