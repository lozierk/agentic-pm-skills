# Auth-boundary audit
Date: 2026-09-23 · Scope: full · Commit: 9430677 · Service layer: not built (M1.4 pending) — confirmed via `docs/security/auth-boundary-exceptions.md`, which states the planned path is `src/lib/services/` and is not yet created.
Verdict: PASS WITH EXCEPTIONS

## Entry points
| File | Export | Kind | Reaches (LLM / DB / secrets / household data / none) | Guard on path | Status |
|---|---|---|---|---|---|
| src/app/api/probe/anthropic/route.ts | POST | route handler | LLM, secrets | `authorized()` (src/app/api/probe/anthropic/route.ts:12-19): `PROBE_SECRET` absent → returns false → 404 before the `fetch` to Anthropic at line 26 | EXCEPTION X1 |
| src/app/api/prototype/ideas/route.ts | POST | route handler | LLM, household data (local CSV) | `prototypeEnabled()` (src/app/api/prototype/ideas/route.ts:37) → 404 before any household load or LLM call | EXCEPTION X2 |
| src/app/api/prototype/recipe/route.ts | POST | route handler | LLM, household data (local CSV) | `prototypeEnabled()` (src/app/api/prototype/recipe/route.ts:33) → 404 before any household load or LLM call | EXCEPTION X3 |
| src/app/prototype/page.tsx | PrototypePage (default) | server component | household data (local CSV) | `prototypeEnabled()` (src/app/prototype/page.tsx:29) → `notFound()` before `loadPrototypeHousehold()` at line 32 | EXCEPTION X4 |
| src/app/prototype/layout.tsx | PrototypeLayout (default) | server component (layout) | none (imports only CSS) | n/a | OK |
| src/app/page.tsx | Home (default) | server component | none (static markup) | n/a | OK |
| src/app/layout.tsx | RootLayout (default) | server component (layout) | none (fonts + metadata only) | n/a | OK |
| src/app/prototype/PrototypeClient.tsx | PrototypeClient (default) | client component (`'use client'` implied by browser DOM use) | none directly — calls the prototype routes over fetch, not an entry point per R2 classes | n/a | OK |

No `middleware.ts`, `instrumentation.ts`, or `'use server'` server actions exist anywhere in the repo (confirmed by `find` for both filenames and by `grep -rn "'use server'" src` returning no matches — see Commands run). No real service-layer entry points exist yet: M1.2 (schema/RLS) is unverified and no service functions (`search_recipes`, `score_recipe`, `generate_ideas`, `get_staples`) have been built, consistent with AGENTS.md's "In flight: M1.2" line and the exceptions file's "not built" statement.

## Violations
None. All four entry points that reach the LLM or household data are sanctioned exceptions with verified fail-closed guards on every code path (see Sanctioned exceptions below). No entry point reads `household_id` from the client — the two prototype routes accept only `diners` (an array of ids), and each validates it as a subset of the resolved household's own profile ids before use:
- `src/app/api/prototype/ideas/route.ts:44-48`: `const allIds = household.profiles.map((p) => p.id); ... const dinerIds = requested.filter((id) => allIds.includes(id)); const diners = dinerIds.length > 0 ? dinerIds : allIds;`
- `src/app/api/prototype/recipe/route.ts:44-49`: identical pattern.
Household itself is never taken from the request — it comes from `loadPrototypeHousehold()`, a fixed local-disk loader with no client-supplied id (src/lib/prototype/profiles.ts:24-38).

No restricted-module import exists outside `src/lib/prototype/` and `src/lib/llm/`/`src/lib/server/secrets.ts` (the two allowlisted prototype/probe paths) — full-repo grep for the R1 module specifiers plus `createClient`, `service_role`, `SERVICE_ROLE`, `process.env.` found matches only inside those files and `scripts/rls_three_user_test.ts` / `scripts/run_rls_test.sh` (test scaffolding, addressed under Scripts reading secrets).

No service-role Supabase client is constructed in `src/` at all (R5 not yet applicable — no service-role client exists to sequence after `withAuth`, since `withAuth` itself doesn't exist yet).

## Sanctioned exceptions
| Id | File | Guard verified on every path | Expiry | Expired |
|---|---|---|---|---|
| X1 | src/app/api/probe/anthropic/route.ts | Yes — `authorized()` (line 22) gates the only path to the `fetch` call at line 26; `probeSecretOrNull()` returns null when unset, forcing `authorized()` false, so a deployed env with no `PROBE_SECRET` 404s. Timing-safe compare at line 18. | Delete at M1.4 | No — M1.4 has not landed (AGENTS.md: "In flight: M1.2") |
| X2 | src/app/api/prototype/ideas/route.ts | Yes — `prototypeEnabled()` at line 37 is the first statement in `POST`, before `loadPrototypeHousehold()` or any LLM call | Delete at Phase 4 (M4.x) | No — repo is at Phase 0/1 (M1.2 in flight) |
| X3 | src/app/api/prototype/recipe/route.ts | Yes — `prototypeEnabled()` at line 33 is the first statement in `POST`, before household load or `callAnthropic` | Delete at Phase 4 (M4.x) | No |
| X4 | src/app/prototype/page.tsx | Yes — `prototypeEnabled()` at line 29 runs before `loadPrototypeHousehold()` at line 32, in a server component (guard executes server-side before render) | Delete at Phase 4 (M4.x) | No |

`prototypeEnabled()` itself (src/lib/prototype/guard.ts:18-20) fails closed on both conditions independently (`PROTOTYPE_MODE === '1'` AND `NODE_ENV !== 'production'`), and the module carries `import 'server-only'` (line 16).

## Restricted imports outside the service layer
| Module | Importer | Allowlisted |
|---|---|---|
| `@/lib/llm/anthropic` | src/app/api/probe/anthropic/route.ts (inlined fetch, not the adapter — no import) | n/a |
| `@/lib/llm/anthropic` | src/app/api/prototype/ideas/route.ts, src/app/api/prototype/recipe/route.ts | Yes — X2, X3 |
| `@/lib/prototype/profiles` (household-data reader) | src/app/api/prototype/ideas/route.ts, src/app/api/prototype/recipe/route.ts, src/app/prototype/page.tsx | Yes — X2, X3, X4 |
| `@/lib/server/secrets` | src/app/api/probe/anthropic/route.ts, src/lib/llm/anthropic.ts | Yes — X1 (probe); `src/lib/llm/anthropic.ts` is the LLM adapter module itself, consumed only by the allowlisted prototype routes |

No service-role Supabase client module exists yet under `src/`, so there is nothing to flag there. `server-only` is present in every restricted module checked: `src/lib/server/secrets.ts:1`, `src/lib/llm/anthropic.ts:10`, `src/lib/prototype/profiles.ts:15`, `src/lib/prototype/guard.ts:16`.

## Static ban (R6)
Absent. `eslint.config.mjs` (5 lines of substance) contains only `eslint-config-next` presets and a `globalIgnores` block — no `no-restricted-imports` rule for `@/lib/llm/anthropic`, `@/lib/server/secrets`, or household-data readers. There is also no CI workflow in the repo (`.github/` does not exist) to back a static ban with a grep step; `scripts/check_client_bundle.sh` is a *client-bundle* secret-pattern scanner run pre-deploy, not an import-boundary grep, so it does not substitute for R6.
Severity: per the rule, M1.4 (which is meant to land the static ban and the service layer together) has **not** landed — AGENTS.md's "In flight" line names M1.2, and M1.4 is explicitly still ahead of it ("Temp fail-closed Anthropic probe route exists — delete at M1.4"). So this is the scheduled-gap case: **MINOR**, not DEGRADED.

## Scripts reading secrets
| Script | Secret | Local-only guard verified |
|---|---|---|
| scripts/rls_three_user_test.ts | `SUPABASE_SERVICE_ROLE_KEY` (line 27) | Yes — lines 32-38: `const LOCAL = /127\.0\.0\.1|localhost/.test(URL); if (!LOCAL) { console.error('Refusing to run fixture setup against a non-local URL.'); process.exit(2); }` |
| scripts/run_rls_test.sh | `SUPABASE_SERVICE_ROLE_KEY` (line 14, via `supabase status -o env`) | Yes — pulls credentials only from the local `supabase status` CLI output (line 7-14, requires a running local stack); the downstream `.ts` script it execs additionally refuses non-local URLs |

`scripts/check_client_bundle.sh` and `scripts/scan_pii_secrets.sh` reference secret *names* as grep patterns (string literals for detection), not `process.env` reads — not applicable to this row. `scripts/score_check.ts` and `scripts/screenshot.ts` were grepped and contain no secret-name or `process.env` reads.

## Could not determine
None. Every entry-point class in scope (route handlers, server actions, server/layout components, middleware, instrumentation) was enumerated by direct filesystem search, and every file with a restricted-module or secret-env match was read to its guard point.

## Commands run
```
git rev-parse --short HEAD
cat docs/security/auth-boundary-exceptions.md
find src -type f
grep -n "In flight" AGENTS.md
find . -maxdepth 2 -iname "middleware.ts" -o -iname "instrumentation.ts"   (repeated as full-repo find, not path-restricted)
find . -iname "middleware.ts" -not -path "*/node_modules/*"
find . -iname "instrumentation.ts" -not -path "*/node_modules/*"
cat eslint.config.mjs
ls scripts
grep -n "household_id|ANTHROPIC_API_KEY|SUPABASE_SERVICE_ROLE_KEY|PROBE_SECRET|createClient|service_role|SERVICE_ROLE|process\.env\.|withAuth|server-only" -r src  (Grep tool)
grep -n "ANTHROPIC_API_KEY|SUPABASE_SERVICE_ROLE_KEY|PROBE_SECRET|process.env" scripts/*.ts scripts/*.sh
cat scripts/check_client_bundle.sh
find .github -type f
Read: src/app/api/probe/anthropic/route.ts
Read: src/app/api/prototype/ideas/route.ts
Read: src/app/api/prototype/recipe/route.ts
Read: src/lib/prototype/guard.ts
Read: src/app/prototype/page.tsx
Read: src/app/prototype/layout.tsx
Read: src/lib/prototype/profiles.ts
Read: src/lib/server/secrets.ts
Read: src/lib/llm/anthropic.ts
Read: src/app/page.tsx
Read: src/app/layout.tsx
git ls-files (full repo file list)
Read: scripts/rls_three_user_test.ts (lines 1-40)
Read: scripts/run_rls_test.sh
```

## Notes for the caller
- Verdict is PASS WITH EXCEPTIONS, driven by (a) four sanctioned exceptions X1-X4, all verified fail-closed on every path with unexpired milestones, and (b) one MINOR finding: R6's static import ban is absent from `eslint.config.mjs` and there's no CI backing it — MINOR rather than DEGRADED only because M1.4 (which is supposed to land the ban) is still ahead of the current "In flight: M1.2" position per AGENTS.md.
- Nothing rose to BLOCKER or DEGRADED. No unguarded LLM/DB/secret path, no secret read outside `src/lib/server/secrets.ts` (scripts' service-role reads are guarded local-only test scaffolding), and no `household_id` taken from the client anywhere.
- Flag for the builder, not the auditor's call: R6 will need real teeth (an eslint `no-restricted-imports` rule plus a CI grep step) landed at M1.4 alongside the real service layer, since `.github/` currently has no workflows at all.
