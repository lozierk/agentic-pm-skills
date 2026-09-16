# Ledger — viome-meals-v1-build

Unresolved variables from the wargame (`wargames/viome-meals-v1-build.md`). **Resolve every
item before Stage 3 (Codex red-team).** Format: what — why it matters — what happens if
guessed wrong. Resolutions get folded into the PRD body at Stage 4 (integrate).

Resolution walkthrough with Kurt: 2026-07-06. **All 10 items RESOLVED** — the ledger is
clear for Stage 3 (Codex red-team), subject to one process rider from L1: Kurt's full solo
read-through of rev 3 before the markup gate closes.

---

**L1 — RESOLVED (Kurt, 2026-07-06).** Markup outcomes — the §4 scoring defaults, the §6.1
stack, and the five encoded product answers.
**Resolution:** §4 defaults accepted as proposed (point map 100/70/30, w = 0.75, bands
85/70/50, coverage minimum 3 — all in the versioned config object). Stack confirmed:
Next.js (App Router) + TypeScript on Vercel — abort A3 is retired. All five encoded product
answers confirmed as written. Process rider: the ledger walkthrough covers the named markup
items, **plus** Kurt does one full solo read-through of rev 3 before the markup gate closes —
anything he flags there is incorporated alongside these resolutions.

**L2 — RESOLVED (Kurt, 2026-07-06).** Supabase topology and dev-environment strategy.
**Resolution:** a **new dedicated Supabase project** on the Pro plan is production — its own
auth user pool, RLS blast radius, and Google OAuth callback. Development happens on the
**Supabase CLI local stack (Docker)**: migrations tracked in the repo, real CSVs imported
locally for testing, prod never receives test imports. Abort A6 is retired; M0.2's ordering
note stands (create the prod project before the Google console step, since the callback URL
embeds the project ref). Build-phase precondition verified 2026-07-06: Docker 29.5.3 present
on the Mac Mini; Supabase CLI not yet installed (one-line brew install at build time).

**L3 — RESOLVED (Kurt, 2026-07-06).** The two real users' Google emails.
**Resolution:** Kurt signs in as `<kurt-email>` (confirmed). Cyndi signs in as
`<cyndi-email>`. Both addresses go on the Google consent screen's test-user list and
are the pre-created invite-only users mapped via `household_members`. Per M1.3, the
invite→first-Google-sign-in sequence is verified with a scratch account in dev **before**
Cyndi's real first sign-in.

**L4 — RESOLVED (Kurt, 2026-07-06).** §6.5 acceptance-test user policy.
**Resolution:** a **permanent but disabled** test user — pre-created via the admin API as
email+password (no third Google account needed; disabling public signups blocks
registrations, not sign-ins of existing users), with **no** `household_members` row. The
checked-in acceptance script enables it, runs the four abuse checks (read, write, signed
URL, LLM trigger), and disables it again. Re-run after every schema change. Retires M6.1's
"skipped because awkward" failure mode.

**L5 — RESOLVED (Kurt, 2026-07-06).** Stage-1 latency budget, quantified.
**Resolution:** **p50 ≤ 5s, p95 ≤ 10s** from tap to all three rendered idea cards, and
**progressive streaming is in scope from the start** — first card visible while the rest
generate (~2–3s perceived). The M4.2/M6.2 fork ladder triggers only when this budget is
missed; streaming is rung zero, already built, so the remaining rungs are output-trimming
then Stage-1 model/effort config changes.

**L6 — RESOLVED (Kurt, 2026-07-06).** Generation-time canonicalization policy.
**Resolution:** **trivial canonicalization + an LLM-proposed, human-approved alias table.**
Two layers, both deterministic at runtime:
1. *Trivial canonicalization* — strip+casefold lookup resolving to the stored verbatim
   string (recon-proven collision-free on the current 371-food union vocabulary); the
   importer re-verifies zero-collision on every future import so a retest can never make
   the lookup ambiguous. The scorer stays exact-string on stored names.
2. *Reviewed alias table* (`food_aliases`, **per-household** — `household_id` + RLS like
   every other table; Kurt's challenge 2026-07-06) — populated **lazily from real runtime
   misses**, never pre-generated: a failed match renders Unrated and is logged with recipe
   context; the LLM proposes alias mappings with that evidence attached; a household member
   approves/rejects (trickle review; repo-file PR-style in v1); only approved aliases affect
   matching, and only for the approving household. This is the third instance of the
   project's LLM-proposes → human-confirms-once → code-enforces-forever pattern (§3.3
   rules, §5.6 attributes). Lookup order: household aliases → trivial canonicalization →
   unmatched.
**Why per-household, not global (settled):** aliases are regionally/culturally variable, and
the same word can mean *different foods* in different regions ("coriander" = cilantro
leaves UK / seed US) — a global table cannot represent that and a wrong resolution shows
the wrong food's ratings (SEV-1 class). Governance: alias approval is a household member's
review of their own recipe contexts — global scope would make that a cross-tenant write to
safety-adjacent data, which the RLS canon forbids. Principle for the canon: **attributes
are facts about foods (global, §6.4 carve-out); aliases are facts about speakers
(household data).** Future keel (additive, not v1): an operator-curated global tier seeded
by promoting cross-household consensus aliases.
**Red line:** an alias means *the same food under a different name* — never a close-enough
food (that is a substitution, §4.4). Ambiguity stays unmatched/Unrated (fail-safe).
An approved alias must resolve to exactly one target within its household and never shadow
a vocabulary name (bijectivity guard at import and approval time, per household).

**L7 — RESOLVED (Kurt, 2026-07-06).** Band-boundary rounding rule.
**Resolution:** **round-then-band, integer display.** Scores round half-up to integers
before banding: 84.6 → 85 → "Great". The displayed number always agrees with its band
label (no "85 — Good" beside "85 — Great"); integers match Viome's own card style. Fixtures
encode this rule.

**L8 — RESOLVED (Kurt, 2026-07-06).** PDF-extraction acceptance bar for v1 "done."
**Resolution:** both fallbacks pre-authorized. **Health scores:** automated extraction first
(code-verified: exact-match names against the 69 definitions, count exactly 69, enum
ratings; Kurt spot-checks ~10/person) — if association proves unreliable, **manual entry of
the 69 × 2 rows is approved** (bounded tedium, zero fabrication risk). **Microbes/genes:**
if clean extraction resists, **deferral is v1-complete** — source PDFs captured in the
private bucket, extraction re-runnable later under append-only imports, absent kinds
recorded honestly (never faked as `complete`). The executor never faces
fabricate-vs-stall.

**L9 — RESOLVED (Kurt, 2026-07-06).** `food_attributes` review protocol.
**Resolution:** the five-part protocol is **confirmed as proposed**: two independent LLM
passes (different framings) → Kurt exhaustively reviews all disagreements + every
allergy-relevant row presented as per-attribute **block-lists** ("a shellfish rule would
block: …") + a random 10% sample of agreements, in ≤40-food batches with a required
"one thing I'd double-check" note per batch; ≥ ~20% disagreement → stop and tighten the
taxonomy definitions before regenerating. **Medium:** a throwaway **local HTML review page**
(block-lists + checkboxes — Kurt's visual-confirmation style) whose approvals land in
**repo files**; the repo record is the approval artifact and the seed ships from it. The
HTML page is build tooling like Impeccable — not a product feature, not an import UI
(§8 non-goal untouched).

**L10 — RESOLVED (Kurt, 2026-07-06).** The v1 attribute taxonomy, as a fixed list.
**Resolution:** **13 attributes adopted**, grounded in the §5.3 filters, the US big-9
allergens, and a probe of the actual vocabulary:
`red_meat`, `poultry`, `fish`, `shellfish` (flesh four); `dairy`, `egg`, `gluten_grain`,
`tree_nut`, `peanut`, `soy`, `sesame` (remaining big-9 — the vocabulary is full of nuts,
soy, and sesame, which the PRD's example list missed); `honey` (in the vocabulary;
vegetarian-but-not-vegan edge); `caffeine` (coffee + true teas present; included now
because adding an attribute post-review means re-reviewing ~400 foods). Deliberately
absent — the vocabulary contains none: alcohol, gelatin. The **filter→attribute mapping**
(Vegetarian excludes the flesh four; Vegan adds dairy/egg/honey; Pescatarian excludes
red_meat+poultry; No Red Meat → red_meat; No Fish → fish; Gluten-Free → gluten_grain;
Dairy-Free → dairy) ships as a config artifact beside the seed. Edge-case definitions
(pork = red meat?, coconut = tree nut?, crustacean/mollusk split) are pinned in the
taxonomy definitions doc the two-pass generation runs from (build phase, informed by the
actual profile rules at setup).

---

**Executor-behavior assumption (standing, for the red-team):** the wargame assumes Fable 5 in
Claude Code fails in these characteristic ways — eagerness past process gates (M0.1),
`git add -A` before hygiene (M0.3), string-normalization "hygiene" that corrupts verbatim
data (M2.1), service-role convenience eroding RLS verification (M1.2), constants inlined into
UI during styling (M3.3), fail-open as the natural code shape (M3.2), and declaring done
without running the awkward acceptance test (M6.1). These assumptions are introspective
(author model = executor model) and should be attacked by the cross-vendor red-team.
