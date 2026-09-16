# Wargame — viome-meals-v1-build

**Date:** 2026-07-06
**Spec:** `Viome_Meals_PRD.md` rev 3 (pre-markup — see Ledger L1)
**Mission brief:** `wargames/Mission_Brief_viome-meals-v1-build.md`
**Executor:** Fable 5 in Claude Code (confirmed by Kurt)
**Unresolved variables:** `wargames/ledger.md` — resolve before red-team (Stage 3)

**Executor-behavior caveat:** this wargame was written by the same model that will execute
(Fable 5 simulating Fable 5). Failure-mode knowledge is introspective and therefore shares the
executor's blind spots. The cross-vendor red-team (Codex, Stage 3) is the corrective — it
should attack the executor-behavior assumptions hardest.

## Reconnaissance findings (verified against the real files, 2026-07-06)

These are facts, not spec assertions — the executor can rely on them:

- CSV format confirmed: `"Food","Category"` header; **370 data rows Kurt / 371 Cyndi**;
  category counts match PRD §3.1 exactly (Kurt 45/195/100/30, Cyndi 30/212/109/20).
- Files have **no trailing newline** (naive `wc -l` undercounts by one — a trap for count
  verification).
- **3 food names contain embedded commas** (`"Yogurt (coconut, plain)"`,
  `"Yogurt (Cow Milk, Plain)"`, `"Yogurt (soy, plain)"`) — naive comma-split parsing breaks;
  a real CSV parser is mandatory.
- **2 trailing-space names per file** (`"Adzuki Beans "`, `"Dandelion Tea "`) — PRD's quirk
  claim confirmed, plus one it missed: Dandelion Tea.
- **The vocabulary's casing is internally inconsistent** (`"Yogurt (Cow Milk, Plain)"` in
  title case beside lowercase siblings). Not in the PRD. Makes verbatim-copy by the LLM
  harder and feeds Ledger L6 (canonicalization question).
- `pdftotext` extracts the **Recommendations PDF** cleanly; Maintain/Improve/Attention
  markers present as standalone lines **but the same words also appear inside prose
  descriptions** — line-grep extraction will over-match; name↔rating association needs a
  structural or LLM-assisted parse with code verification (see M2.3).
- The **Results PDF** extracts cleanly; contains PII (DOB, client IDs) — reinforces
  private-bucket handling (§7.5).

---

## Phase 0 — Preconditions (before any code)

### M0.1 — Hold for the markup gate; diff the agreed PRD against rev 3

**Move:** Do not scaffold, do not write schema. Wait for Kurt's markup of rev 3 to resolve
into an agreed PRD; produce an explicit diff of what changed (scoring defaults §4, stack §6.1,
the five encoded product answers).

**Expected observation:** an agreed PRD revision exists; the diff list is short and enumerable;
each changed item maps to a known battle-plan sensitivity (numbers → config seed only; stack →
re-plan Phase 1).

**Failure signal:** build activity starting against rev 3 "because the changes will probably
be small" — the pre-markup spec-shift risk (Kurt's declared risk #2) realized by the
executor's own eagerness.

**Most likely failure:** Fable-class executors under-weight process gates when the technical
path is clear. The scaffold is one command; the temptation is to "get ahead" on
markup-insensitive work and drift into markup-sensitive work.

**Counter-move:** the battle plan explicitly partitions moves into markup-insensitive
(M0.2, M0.3, importer design, scorer test fixtures on paper) and markup-sensitive (everything
in Phases 1+ that touches the stack or bakes numbers). If the executor starts early, it may
touch only the first set. Second-order: if markup drags and Kurt asks to start anyway, get his
explicit go on the stack (§6.1) alone — that is the only expensive reversal.

**Fork triggers:**
- Markup confirms stack + numbers → proceed to Phase 1 unchanged.
- Markup changes numbers only → update `scoring_configs` seed + test fixtures; no re-plan.
- Markup rejects Next.js/TS → **stop; re-wargame Phase 1** with the new stack before any code
  (see Abort A3).

### M0.2 — Kurt's external accounts (Anthropic Console, Vercel, Google OAuth)

**Move:** Kurt (owner, per PRD §10): create Anthropic Console account + billing; finish Vercel
signup; create Google Cloud OAuth consent screen; paste client ID/secret into Supabase Auth.
Executor verifies each with a live probe (one trivial API call; one Vercel deploy permission
check; OAuth config visible in Supabase dashboard).

**Expected observation:** a $0.01-class Anthropic test call returns 200 with usage metadata;
Vercel project creatable; Supabase Auth shows Google provider enabled.

**Failure signal:** 401/403 from Anthropic (billing not active); OAuth `redirect_uri_mismatch`
at first sign-in attempt.

**Most likely failure:** Google OAuth misconfiguration — the consent screen in Testing mode
without both users added as test users, or the redirect URI not matching Supabase's callback
(`https://<project-ref>.supabase.co/auth/v1/callback` — one URI, but easy to fat-finger, and
the Supabase project must already exist to know it: ordering dependency with Ledger L2).

**Counter-move:** resolve L2 (Supabase project topology) *before* the Google console step;
add both Kurt's and Cyndi's Googles as test users (needs L3 — Cyndi's email). Second-order: if
OAuth still fails after config, verify with Supabase's auth logs (dashboard) rather than
guessing; third-order: unblock dev with a Supabase-native magic-link sign-in for the two
pre-created users while OAuth is debugged — invite-only stays intact; remove it once Google
works (spec allows additional sign-in methods later, §6.5).

**Fork triggers:**
- Anthropic key blocked/delayed → LLM-free workstreams proceed (schema, importer, scorer, UI
  shells); generation code develops against a mocked client interface. Do not fake LLM output
  as if real — mark mocked results visibly.
- All three ready → Phase 1 in full.

### M0.3 — `git init` + secrets hygiene before the first commit

**Move:** `git init` (lands with the agreed PRD, per canon); write `.gitignore` covering
`.env*` and local Supabase artifacts **before** the first `git add`; first commit is the
existing project documents.

**Expected observation:** `git status` shows no env files as untracked-tracked; the repo's
first commit contains docs only.

**Failure signal:** any secret-shaped string in `git log -p` output.

**Most likely failure:** agentic executors commit early and broadly (`git add -A`) — an
`.env.local` created during eager scaffolding gets committed before `.gitignore` exists.

**Counter-move:** `.gitignore` is the first file the repo ever sees. Second-order: if a key
is ever committed, **rotate it at the provider immediately** — history rewriting is not the
fix, rotation is; then rewrite history only if convenient.

**Fork triggers:** none — this move has no acceptable failure branch.

---

## Phase 1 — Foundation

### M1.1 — Scaffold Next.js (App Router) + TypeScript; env plumbing; deploy hello-world

**Move:** `create-next-app` with TS; wire Supabase JS client (anon key client-side,
service-role + Anthropic key server-only); deploy the skeleton to Vercel.

**Expected observation:** hello-world at the `*.vercel.app` URL; a server route can read
`ANTHROPIC_API_KEY`; a grep of the built client bundle (`.next/static`) finds **no**
occurrence of the service-role key or Anthropic key.

**Failure signal:** `undefined` env at runtime (var set in wrong Vercel environment —
Production vs Preview); or the bundle-grep hits.

**Most likely failure:** a secret referenced from code that ends up in a client component —
Next's server/client boundary is easy to blur, and LLM executors cargo-cult `NEXT_PUBLIC_`
prefixes when an env read "doesn't work."

**Counter-move:** all secret access flows through one module marked with `import 'server-only'`
(build fails if a client component imports it); the bundle-grep runs in CI/pre-deploy as a
script, not a one-time check. Second-order: if a secret ever reaches a deployed bundle, rotate
(as M0.3).

**Fork triggers:**
- Dev-environment strategy per Ledger L2 resolution: local Supabase (`supabase start`) vs
  second cloud project vs prod-only. Do not improvise this — every later data move depends
  on it.

### M1.2 — Schema DDL + RLS on every table + the two global seed tables

**Move:** create all §7.1 tables with `household_id` everywhere (except
`health_score_definitions`, `food_attributes`); enable RLS on **every** table; policies grant
row access only via `household_members` membership; seed tables readable by any authenticated
user, writable by none from the client.

**Expected observation:** an RLS test script (three sessions: Kurt, Cyndi, non-member) passes:
members see their household's rows, the non-member sees zero rows and can write nothing —
**executed with the anon key + real session JWTs, never the service role.**

**Failure signal:** the non-member reads or writes anything; or (opposite pole) members see
zero rows in the real app while everything "worked" in dev.

**Most likely failure:** RLS validated only through service-role connections (which bypass
RLS), so policies are wrong in both directions and nobody notices until prod. This is the
classic Supabase failure and agentic executors fall into it because service-role clients make
dev friction disappear.

**Counter-move:** the three-user RLS test script is written **with the DDL, not after**, runs
on every schema change, and is the §6.5 acceptance test's first half. Second-order: if
policies get gnarly, centralize membership in one `security definer` function
(`current_household_ids()`) — a bug there fails closed (empty set), not open; verify the
closed direction with the non-member user. Third-order: if the executor is ever found using
the service-role key in an app code path beyond the documented post-membership-check uses
(§6.5), that is a red-line finding — stop and remove, no matter what it unblocks.

**Fork triggers:**
- RLS test can't run because only one Google account exists yet → don't skip: create the
  second/third users per Ledger L3/L4 first. Testing RLS with one user is not testing RLS.

### M1.3 — Auth: invite-only + Google OAuth + pre-created users + `household_members`

**Move:** disable public signups in Supabase Auth; pre-create Kurt's and Cyndi's users; map
both to the household in `household_members`; wire the Google sign-in flow.

**Expected observation:** both pre-created users complete Google sign-in and land
authenticated; a Google account **not** pre-created is refused at sign-in (not after).

**Failure signal:** an invited user's first Google sign-in is rejected as "signups disabled" —
i.e., Supabase treats the OAuth first-contact as a *new signup* rather than a sign-in of the
pre-created user.

**Most likely failure:** exactly that identity-linking nuance. Pre-creating a user by email
creates an email identity; whether the first Google OAuth sign-in links to it or attempts a
fresh signup is Supabase-version-dependent behavior that must be verified empirically, not
assumed.

**Counter-move:** test the full invite→first-Google-sign-in sequence with a scratch account in
dev **before** doing it with Cyndi's real account. Second-order: if linking fails, the
fallback sequence is — enable signups temporarily, have both real users sign in via Google
once (creating OAuth-native users), map them in `household_members`, then disable signups.
During the temporary window the JWT-membership gate (M1.4) already blocks any stranger from
doing anything. Third-order: if even that misbehaves, magic-link sign-in for the two users is
the spec-sanctioned fallback (§6.5: additional methods are not a one-way door) — report to
Kurt before adopting it as permanent.

**Fork triggers:**
- Linking works → done.
- Linking fails → temporary-window fallback above.
- Google provider itself blocked (org policy, consent-screen verification wall) → **abort
  path A1**: auth method needs a Kurt decision.

### M1.4 — Service-layer skeleton: JWT gate + household derivation as a single wrapper

**Move:** implement one `withAuth` wrapper that (1) verifies the Supabase session JWT
server-side, (2) resolves the household via `household_members`, (3) rejects before any DB or
LLM work otherwise; every §5.7 function is born inside it. No function signature anywhere
accepts `household_id` from the client.

**Expected observation:** calling any endpoint with no/invalid JWT returns 401 with **zero**
Anthropic usage recorded and zero DB reads; grep for `household_id` in request-body/query
parsing finds nothing.

**Failure signal:** any endpoint reachable without the wrapper; any Anthropic usage from an
unauthenticated probe.

**Most likely failure:** gate drift — the wrapper exists but a later function (added in
Phase 4/5 excitement) mounts a route without it. Root cause: per-route opt-in discipline
decays over a long agentic build.

**Counter-move:** an automated test enumerates all API routes and calls each unauthenticated,
asserting 401 — new routes fail the test by default if unwrapped (make the test discover
routes from the filesystem, not a hand-list). Second-order: the §6.5 acceptance script
re-checks all four abuse cases per route class before "done."

**Fork triggers:** none — structural move; failures route back into it.

---

## Phase 2 — Data import

### M2.1 — Food-ratings CSV importer with lifecycle (verbatim names)

**Move:** implement `import_snapshot` for `food_ratings`: `pending` row → source file to
private Storage → parse with a real CSV parser → transactional insert → `complete` with
sha256 + expected/actual counts.

**Expected observation:** Kurt import: 370 rows; Cyndi: 371; category counts match recon
exactly (45/195/100/30 and 30/212/109/20); a round-trip test asserts byte-identical names for
the five known quirk rows (2 trailing-space + 3 embedded-comma); the sha256 matches a locally
computed one.

**Failure signal:** counts off by one (trailing-newline trap — recon confirmed the files lack
one); quirk-row test fails (a `.trim()` or normalizer crept in); yogurt rows split wrong
(naive comma parsing).

**Most likely failure:** silent name normalization. LLM executors habitually add
`.trim()`/casing hygiene to string handling; here that hygiene is corruption — it breaks
exact-string matching later, far from the cause.

**Counter-move:** the quirk-row round-trip test is written **before** the importer (the five
rows are in this file's recon section — the fixture is free). Second-order: if a failure
occurs mid-import, verify the lifecycle does its job: import stays `failed`, zero partial
rows visible as current, prior complete import (if any) still current.

**Fork triggers:**
- Counts mismatch expected → import marks itself `failed`; investigate before touching parser
  settings. Never "best-effort" a partial import to complete.
- A future re-export from Viome changes format → treat as new-format work, not a parser hack;
  if the header differs from `"Food","Category"` → abort path A2 (data-model assumption
  broken).

### M2.2 — `food_attributes` seed: generate, then human review that resists rubber-stamping (Kurt's risk #1)

**Move:** fix the v1 attribute taxonomy first (Ledger L10 — it must at minimum derive every
§5.3 dietary filter); generate proposed attributes for the ~400-food union vocabulary with
**two independent LLM passes** (different prompts/framings); compute disagreements; assemble
the review artifact.

**Expected observation:** disagreement rate in single-digit percent; the review artifact
presents (a) all disagreement rows, (b) **every** row carrying allergy-relevant attributes
(shellfish, dairy, gluten-grain, egg, fish...) shown as *block-lists per attribute* — "a
shellfish hard rule would block: [list]" — because reviewing what a rule would *do* catches
errors that row-scanning misses (is oyster sauce shellfish? is fish sauce fish? is Worcestershire
anchovy?), and (c) a random 10% sample of agreed rows. Review happens in ≤40-food batches,
as repo files reviewed PR-style (pending L9).

**Failure signal:** review "completed" in one sitting at 400 rows/hour — that is the
rubber-stamp signature (Kurt's declared risk #1), not diligence.

**Most likely failure:** attention collapse mid-review. Root cause: the artifact was built
for completeness (one giant table) instead of for attention (disagreements + block-lists +
sample).

**Counter-move:** the artifact design above **is** the counter-move; additionally the
executor tags each batch with a required "one thing I'd double-check" note from Kurt — a
forcing function against scroll-past. Second-order: if the two LLM passes disagree wildly
(taxonomy too vague), stop generating and tighten the attribute definitions doc first, then
regenerate — do not push a noisy 400-row decision set at a human. Third-order: if review
stalls for days it blocks food-ratings import promotion (§5.6) and therefore the entire app —
see abort path A5 before weakening anything.

**Fork triggers:**
- Disagreements < ~5% → review protocol above.
- Disagreements ≥ ~20% → taxonomy rework loop (second-order above).
- Kurt requests staged review (high-risk attributes now, long tail later) → **not locally
  grantable**: coverage gates import promotion (settled, Codex N1). Take it to markup as a
  spec change or keep full coverage. Never quietly stage it.

### M2.3 — Health scores from the Recommendations PDFs (69 × 2), microbes/genes from Results PDFs

**Move:** `pdftotext`-based extraction (recon: text layer confirmed) with LLM-assisted
structuring where layout interleaves; **code verifies before insert**: extracted score names
must exact-match the 69 seeded definitions, ratings ∈ {Maintain, Improve, Attention}, count
exactly 69 per person; Kurt spot-checks ~10 per person against the rendered PDF.

**Expected observation:** 69 verified rows per person; spot-checks agree with the PDF pages.

**Failure signal:** count ≠ 69; a name that doesn't match the definitions; spot-check
mismatch (the worst signal — plausible fabrication passing structural checks).

**Most likely failure:** rating mis-association — the words Maintain/Improve/Attention appear
both as rating values *and inside prose descriptions* (recon-confirmed), so a naive parse
pairs a score with a nearby prose word. LLM-assisted extraction can also fabricate a
plausible rating when the layout confuses it — and fabricating health data is this project's
cardinal sin.

**Counter-move:** structural verification (count/name/enum) catches gross errors; the human
spot-check targets association errors — pick the 10 checks adversarially (scores adjacent to
Attention-heavy prose), not randomly. Second-order: if association can't be made reliable,
fall back to **manual entry** — 69 × 2 = 138 bounded rows, an hour of tedium, zero
fabrication risk. Third-order: microbes/genes ("fields as available", §7.1) may be genuinely
unstructured — v1 doesn't surface them; store the PDFs in the private bucket now, defer
extraction per Ledger L8 rather than inventing structure.

**Fork triggers:**
- Clean parse → import.
- Ambiguous association → manual-entry fallback for health scores.
- Microbes/genes unparseable → PDFs-in-Storage + deferred extraction (L8 resolution
  permitting), documented in the imports row as absent kinds, not fake `complete` imports.

### M2.4 — Source documents to private Storage with the same RLS discipline

**Move:** upload the 2 CSVs + 4 PDFs path-keyed by household/profile/import; bucket private;
Storage policies mirror table RLS; signed URLs only.

**Expected observation:** member session obtains a working signed URL; non-member session
cannot (this is an explicit §6.5 acceptance item); anonymous URL access fails.

**Failure signal:** a raw object URL opens without a signature; non-member gets a signed URL.

**Most likely failure:** Storage policies forgotten — tables get the RLS love; the bucket
ships on defaults. (Recon note: these PDFs contain DOB and client IDs — this is PII, not just
preference data.)

**Counter-move:** Storage checks live inside the same three-user RLS test script (M1.2), so
they can't be forgotten separately. Second-order: none needed — this either passes the script
or the script was skipped, which is its own red flag.

**Fork triggers:** none.

---

## Phase 3 — Scoring engine (the heart — build before generation, test against real data)

### M3.1 — `score_recipe` as a pure function with real-CSV fixtures

**Move:** implement per-ingredient rating lookup (per-profile, `Unrated` for absent),
per-person 0–100 score (mean over rated non-Avoid, point map from `scoring_configs`), Both
Score `w·min + (1−w)·mean`, coverage counting — as pure code with **no I/O and no LLM**, fed
by data the service layer fetches.

**Expected observation:** fixture tests pass against the real imported data: kimchi
(Superfood Kurt / Minimize Cyndi), lime (Avoid Kurt / Superfood Cyndi), onion (Minimize Kurt /
Avoid Cyndi), lean beef (Enjoy Kurt / Avoid Cyndi), Cane Sugar (rated Cyndi / **Unrated
Kurt**); an N=1 household degenerates to min = mean; a network/LLM mock in the test harness
proves `score_recipe` never calls out.

**Failure signal:** `NaN`/`Infinity` reaching a score result; a fixture disagreeing with the
CSV; any outbound call from the scorer.

**Most likely failure:** empty-set edge cases — a person whose rated non-Avoid ingredient set
is empty (all-Avoid or all-Unrated recipe) makes the mean undefined; the natural code path
emits NaN which propagates to the UI as "NaN — Great". Root cause: §4.2's mean is defined
over a set the spec never guarantees non-empty (the coverage minimum catches most, but
blocked+sparse combinations interleave).

**Counter-move:** a table-driven edge matrix written before the implementation: {empty rated
set, all-Avoid, all-Unrated, exactly-at-coverage-minimum, one-below-minimum, N=1} ×
{score_status precedence: blocked beats insufficient_data beats scored} — every cell asserts
a finite, displayable result. Second-order: band-boundary behavior needs Ledger L7 (rounding)
resolved before fixtures freeze.

**Fork triggers:**
- Any scoring question §4 doesn't answer → **ledger it, never invent** (that is this
  project's founding rule applied to its own build).

### M3.2 — Hard-rule gates + fail-closed attribute evaluation (Codex N1's grave)

**Move:** implement `blocked_food` (exact-string against `blocked_refs`) and
`blocked_attribute` gates; a matched ingredient with **no reviewed `food_attributes` record**
counts as violating **every** attribute-based hard rule in the household (§4.4).

**Expected observation:** a dedicated test — food with no attribute record + household has
one attribute hard rule → `blocked` — passes; and the same evaluator module serves scoring,
Stage-1 provisional checks, substitution verification, and the save gate (one implementation,
four call sites).

**Failure signal:** the no-record test passes an unreviewed food; or grep finds two
implementations of "does ingredient violate rule."

**Most likely failure:** fail-closed silently regressing to fail-open, because the natural
code shape (`record?.attributes.includes(x)`) returns false on absence. This is exactly the
Major finding (N1) Codex caught in the spec — the code-level version of it is the single most
likely safety bug in the build.

**Counter-move:** the no-record test above is non-negotiable and named after N1 so nobody
deletes it casually. Second-order: the import promotion gate (§5.6) should make the situation
unreachable — test both layers independently anyway (defense in depth is only defense if each
layer is verified alone). Third-order: mutation-test the gate once (flip the fail-closed
branch, confirm the suite fails) — cheap insurance that the test actually bites.

**Fork triggers:** none — safety moves don't fork.

### M3.3 — `scoring_configs` versioned object, echoed in results

**Move:** seed the household's default config (point map 100/70/30, w=0.75, bands 85/70/50,
coverage min 3 — **pending markup, L1**); every score result carries the config version; band
labels come from the result payload, never hardcoded client-side.

**Expected observation:** editing the config in the DB changes scores/bands on next read with
zero code deploy; grep finds no "Great"/"Good"/"Fair"/"Poor" literals in components.

**Failure signal:** UI bands disagree with server scores after a config change.

**Most likely failure:** constants duplicated into the UI during styling work — an LLM
executor building a badge component will inline "85" without thinking.

**Counter-move:** the score payload includes the resolved band label; components render, never
compute. Second-order: one integration test flips the config and asserts the rendered badge
follows.

**Fork triggers:** markup changes the numbers (L1) → seed + fixtures update; nothing else
moves (this is why the config object exists).

---

## Phase 4 — Generation

### M4.1 — Prompt-prefix builder: deterministic serialization, one breakpoint, observable cache hits

**Move:** build the byte-stable prefix (system template + both profiles' current ratings +
rules + staples), rebuilt from the DB per request with **ORDER BY on every feeding query**;
exactly one `cache_control` breakpoint at the prefix end; log `prompt_prefix_hash` per call.

**Expected observation:** two consecutive identical-state builds → identical hashes; the
second API call reports `cache_read_input_tokens > 0` in usage; a staples edit changes the
hash once, then re-caches.

**Failure signal:** hash flapping between identical-state calls; or stable hashes with zero
cache reads.

**Most likely failure:** nondeterministic DB row order — Postgres without ORDER BY returns
rows in any order, so the prefix differs per request, cache hit rate is 0%, **and the app
still works** — the failure is silent, costing only latency/money, so it survives to prod
unnoticed.

**Counter-move:** hash-stability is an automated test, and cache-read tokens are asserted in
a live two-call smoke test (within the 5-minute cache TTL). Second-order: stable hash but no
cache read → volatile bytes before the breakpoint (timestamp, request ID) or breakpoint
misplaced — diff two raw request bodies byte-for-byte; that always localizes it. Third-order:
calls > 5 min apart naturally miss (TTL) — don't chase ghosts in a two-user household where
gaps are normal; assert cache behavior only in the smoke test's controlled timing.

**Fork triggers:** none — this is instrumentation + discipline.

### M4.2 — `generate_ideas` (Stage 1): ~3 cards, verified key ingredients, latency budget

**Move:** low/medium-effort call returning schema-validated cards (title, one-liner, tags,
times, `key_ingredients[]` with proposed `matched_food_name`); verify matches exact-string via
the shared verifier; compute provisional Both Score; flag Avoid/hard-rule cards
("contains lime — Avoid for Kurt; needs substitution"), never suppress.

**Expected observation:** 3 cards in the L5 latency budget; near-all `matched_food_name`
proposals verify; a steering prompt engineered to force a conflict ("citrus-heavy marinade")
produces a flagged card, not an empty slot.

**Failure signal:** high unverified-match rate (cards scored mostly on Unrated ingredients —
provisional badges become noise); or conflict cards silently missing (the model
self-censoring Avoids — a subtle self-grading leak, §2.1/§8).

**Most likely failure:** exact-string verification failing on the vocabulary's own quirks —
recon confirmed trailing spaces, embedded commas, *and inconsistent casing*
(`"Yogurt (Cow Milk, Plain)"`). The model will emit clean casing and no trailing space;
verbatim-copy instructions help but won't fully hold. Root cause: the vocabulary is hostile
to verbatim generation; resolution is Ledger L6 (canonicalization policy), not prompt heroics.

**Counter-move:** embed the exact vocabulary strings in the prefix with copy-verbatim
instruction (they're already there as ratings data); apply the L6-resolved canonicalization
at the verifier boundary only, storing the canonical verbatim string. Second-order: measure
the unverified rate on a 20-prompt smoke suite; if it stays >10% after L6, the vocabulary
lookup needs a deterministic alias table (built once, human-reviewed — small since misses
concentrate on the same foods) — still exact-string at the scorer, per §3.1.

**Fork triggers (latency, max 3):**
- Budget met → done.
- Miss by <2× → trim card verbosity (output tokens dominate) and/or stream cards
  progressively (L5 decides if streaming is in scope).
- Miss by ≥2× → drop Stage-1 model/effort via config (model is a config value by design,
  §6.2) — a config change, not a code change; report the quality trade to Kurt.

### M4.3 — `generate_recipe` (Stage 2) + `refine_recipe` + the `recipe_draft` object

**Move:** high-effort call returning the full structured recipe (schema-enforced via tool-use
/ structured output); every ingredient carries `matched_food_name` or arrives unmatched; full
deterministic re-score server-side; drafts carry idea/filters/steering/turns/template-version;
profiles/rules/staples **always re-derived server-side** — draft content steers, never
authorizes.

**Expected observation:** valid structured output on repeated runs (20-generation smoke suite,
zero malformed); every refinement turn re-scores; a tampered draft (client-modified rules
smuggled into the conversation text) changes nothing about gating — the server's own profile
data governs.

**Failure signal:** JSON/schema failures on long recipes; a refinement that edits ingredients
without the gates re-running; any code path where draft content reaches the scorer as if it
were profile data.

**Most likely failure:** structured-output drift on long, chatty outputs (chef's notes with
quotes/newlines breaking the schema) — intermittent, so it survives light testing.

**Counter-move:** schema-validate at the API boundary; one retry on invalid; then a visible
error (never a half-parsed recipe rendered as whole). Second-order: single re-score
chokepoint — any draft mutation flows through one function that ends in `score_recipe`; there
is no "light" update path to drift into.

**Fork triggers:**
- Model repeatedly proposes Avoid-heavy recipes for reasonable steering → the designed answer
  is the flag + substitution flow (§5.1) — accept it; optionally one bounded feedback retry
  (code tells the model what blocked; max 1 — latency). Do **not** build regenerate-until-
  clean loops: they hide the data from the user and re-invent self-grading's cousin.

### M4.4 — `suggest_substitutions`: propose with recipe context, verify in code

**Move:** LLM proposes ~8 candidates (over-ask, expecting verification attrition) given the
dish, ingredient role, active filters; code verifies each against both profiles + hard rules;
prefer Enjoy-or-better for both; drop unverifiable.

**Expected observation:** for the canonical blockers (lime for Kurt, onion for Cyndi, lean
beef for Cyndi) at least 2–3 verified substitutions surface with both people's ratings shown.

**Failure signal:** empty substitution lists for common blockers — a blocked recipe becomes a
dead end (user stuck with "needs substitution" and no path).

**Most likely failure:** verification attrition — candidates are culinarily sensible but miss
the vocabulary (exact-string again) or land Minimize/Avoid for the *other* person. In this
household the fermented-foods split (Kurt Superfood / Cyndi Minimize) plus the citrus split
makes both-Enjoy substitutes genuinely scarce for some roles.

**Counter-move:** over-ask (8+) and relax display preference gracefully: both-Enjoy-or-better
first, then both-non-Avoid-non-hard-rule with amber honesty — never unverified candidates.
Second-order: if a role has zero verified candidates, the honest UI answer is "no verified
substitute — try refining the recipe instead", which routes to `refine_recipe`; that path
must exist in the UI, not just the API.

**Fork triggers:** none beyond the graceful-degradation ladder above (that is the fork,
encoded).

---

## Phase 5 — UI

### M5.1 — Impeccable install + seed, immediately after scaffold

**Move:** `npx impeccable install` right after M1.1 (clean tree, committed); seed its
`PRODUCT.md`/`DESIGN.md` from the agreed PRD + `Viome_Screen_Shots/`.

**Expected observation:** install completes without clobbering scaffold files; a diff shows
only Impeccable's own additions; design tokens/conventions available to Phase 5 work.

**Failure signal:** merge conflicts with Next scaffold conventions, or the skill's guidance
fighting the component patterns already laid down.

**Most likely failure:** installing late (after feature UI exists) so its conventions arrive
as rework. Root cause: sequencing, not the tool.

**Counter-move:** the move is scheduled early by design; commit before and after install so a
bad interaction reverts cleanly. Second-order: if the tool misbehaves with this repo shape,
proceed without it and note for Kurt — it is build tooling, deliberately not a PRD
requirement (canon).

**Fork triggers:** works → design phase uses it; fights the repo → revert commit, proceed
bare, report.

### M5.2 — Recipe card, library, staples UI (the safety-visible surface)

**Move:** build the card per §5.2 (Both Score + two person scores + coverage lines,
color-coded ingredient rows, expandable verified substitutions, conservative dietary chips),
library grid with recompute-on-read badges, staples editor.

**Expected observation:** a fixture recipe containing one unmatched ingredient shows **no**
exclusionary chips (no "gluten-free" while an unknown is present); blocked recipes render
blocked (no cookable presentation, no save button); Unrated rows render neutral (final
treatment is a design-phase decision per §5.2 — any placeholder is fine, mislabeling is not).

**Failure signal:** a chip claiming an exclusion the ingredient list can't support; a blocked
recipe with a live save button; NaN/undefined anywhere on the card.

**Most likely failure:** chip logic computed from matched rows only, quietly ignoring the
conservative-fallback rule — the natural implementation ("derive chips from what we know")
is exactly the wrong one ("claim nothing unless everything is known").

**Counter-move:** the unmatched-ingredient fixture above is a standing test; chips derive in
the service layer next to scoring (same data discipline), not in the component. Second-order:
none — this is a fixture-and-placement move.

**Fork triggers:** design decisions (colors, Unrated treatment) → design phase with
Impeccable; never block build on them, never let a placeholder imply a rating.

---

## Phase 6 — Verification and deploy

### M6.1 — The §6.5 acceptance test, run honestly (the trap is skipping it)

**Move:** create a third, pre-created test user (Ledger L4) with **no** `household_members`
row; as that user: attempt reads, writes, signed-URL requests, and a generation call against
Kurt & Cyndi's household. All four must fail. Also probe every route unauthenticated (M1.4's
test).

**Expected observation:** four hard failures with zero Anthropic usage and zero rows
returned; the script is repeatable (it will run again after every schema change).

**Failure signal:** any of the four succeeding — or the test being quietly narrowed to "the
stranger can't even sign in, so we're fine."

**Most likely failure:** the test not really running — because invite-only makes a
non-member *hard to have* (you must invite someone specifically to not belong anywhere,
which feels absurd enough to skip). Skipping it leaves the RLS/authz layer — the
productization keel — unverified against exactly the actor class it exists for.

**Counter-move:** L4 resolves the test-user policy up front so there's no in-the-moment
excuse; the acceptance test is a checked-in script, not a manual poke, and "done" reporting
must quote its output. Second-order: after the run, disable or delete the test user per L4's
resolution — a lingering enabled test user is its own finding.

**Fork triggers:** none — this move is the gate to calling anything done.

### M6.2 — Production cache + latency verification (dev numbers don't transfer)

**Move:** re-run the two-call cache smoke test and the Stage-1 latency measurement **on the
deployed Vercel app**, with Vercel function region colocated with the Supabase region.

**Expected observation:** cache-read tokens > 0 on call 2; Stage-1 p50 inside the L5 budget
from a realistic client.

**Failure signal:** prod latency well above dev — the profile: cold start + N sequential DB
queries × cross-region round-trips (the prefix rebuild touches profiles, ratings ×2, rules,
staples, config every call).

**Most likely failure:** region mismatch (Vercel defaults to `iad1`; the Supabase project
lives wherever it was created — L2) plus sequential awaits turning 6 queries into 6 × RTT.

**Counter-move:** set the function region deliberately; parallelize the prefix queries
(`Promise.all`) or collapse into one RPC; measure with server-timing logs, not vibes.
Second-order: if still slow, the Stage-1 model/effort config fork from M4.2 applies.

**Fork triggers:** as M4.2's latency ladder.

### M6.3 — Real-dinner shakedown (the actual success signal)

**Move:** Kurt and Cyndi decide a real dinner with the app: steer, pick a card, refine once,
cook it, save it.

**Expected observation:** the §1.1 signals — a cooked meal, a saved recipe, and **zero**
instances of a served recipe containing either person's Avoid or a hard-rule violation
without a flagged, verified substitution.

**Failure signal (SEV-1):** either person spots a color/rating on screen that contradicts
their CSV. This is the zero-tolerance class — trust in the color coding is the product.

**Most likely failure:** not a scorer bug but a *matching* gap presenting as one — an
ingredient the model matched to the wrong vocabulary entry (plausible neighbor), rated
correctly *for the wrong food*. It displays as a wrong color with a correct-looking pipeline.

**Counter-move:** the ingredient row's expandable detail shows the matched food name verbatim
next to the rating — making wrong-food matches visible at a glance rather than latent.
Second-order: any SEV-1 stops feature work until root-caused against the CSVs (never
patched by editing displayed values — fix the match/import/scorer layer that lied).

**Fork triggers:**
- Ideas feel generic/repetitive across a week → prompt/steering tuning as usage feedback —
  a quality loop, not a build defect; track examples, tune the template, redeploy (template
  version bumps, cache re-primes).

---

## ABORT CONDITIONS

Observations that mean **stop entirely and report** — counter-moves don't apply.

**A1 — Auth path unworkable.** Google OAuth cannot authenticate the two pre-created users
after M1.3's fallback ladder (linking fails AND the temporary-window sequence fails AND
magic-link is unacceptable to Kurt). Unrecoverable locally because sign-in method is a
Kurt-level product decision (§6.5). Report: the exact Supabase behaviors observed at each
rung, plus the option set (magic link permanent / different provider / passwords).

**A2 — Source-data contract broken.** A CSV that doesn't parse as `"Food","Category"` with
the recon-confirmed shape, or future Viome exports in a new format. Unrecoverable because the
data model and importer are built on this contract; guessing a mapping risks fabricated
ratings — the founding sin. Report: byte-level diff of expected vs observed format.

**A3 — Markup reverses the stack after Phase 1 has begun.** Next.js/TS rejected once scaffold
+ foundation exist. Not a counter-move situation: re-plan (and re-wargame Phases 1, 4, 6)
under the new stack. Report: which completed moves survive (schema DDL, RLS policies, scorer
logic as portable spec, fixtures) and which don't (scaffold, route/wrapper code, deploy
pipeline).

**A4 — Safety-invariant contradiction discovered in the spec.** Any mid-build scenario where
two settled rules conflict (e.g., a flagged Stage-1 card's flow implying presentation of an
uncookable state §5.1 vs blocked-never-cookable §4.5, in some UI corner). Unrecoverable
locally because resolving it means choosing which settled decision bends — Kurt's call by
process (canon: contested items go to markup, not local judgment). Report: the exact
scenario, the two clauses, and 2–3 resolution options with their blast radii.

**A5 — The attribute-review gate starves the pipeline.** `food_attributes` review (M2.2)
stalls indefinitely; food-ratings imports can't promote to `complete` (§5.6); the app has no
current data. The tempting local fix — weakening fail-closed or promoting without coverage —
is forbidden (settled, Codex N1). Report: review-burden numbers (rows reviewed/remaining,
disagreement rate) and the staged-review spec-change option for Kurt to accept or reject at
markup level.

**A6 — Environment/topology impasse.** Ledger L2 unresolved when Phase 1 starts (which
Supabase project; where dev happens). Building against guessed topology contaminates
append-only prod tables with test imports — cleanup fights the project's own immutability
discipline. Stop until L2 is answered; report why prod-only dev is specifically poisonous
here (append-only + "current = latest complete" means test imports *become* current).

---

*Wargame ends. A wargame where every move succeeds is a failed wargame — this one assumes
reality lands at least one punch per phase. Resolve `wargames/ledger.md`, then hand this
file + the ledger + the spec + `references/02-redteam.md` to Codex for Stage 3.*
