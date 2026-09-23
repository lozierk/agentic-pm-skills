# Auth-boundary audit
Date: 2026-09-23 · Scope: full · Commit: 9430677 · Service layer: not built (M1.4 pending; per `docs/security/auth-boundary-exceptions.md` line 5 and AGENTS.md "In flight: M1.2")
Verdict: **FAIL**

## Entry points
| File | Export | Kind | Reaches (LLM / DB / secrets / household data / none) | Guard on path | Status |
|---|---|---|---|---|---|
| `src/app/actions/cook.ts` | `suggestSwap` | server action (`'use server'`) | LLM (secrets via `@/lib/llm/anthropic`) | **none** | **VIOLATION (R2, R3) — BLOCKER** |
| `src/app/api/prototype/swap/route.ts` | `GET` | route handler | household data (local CSV) | `prototypeEnabled()` | VIOLATION (unlisted restricted import) — DEGRADED |
| `src/app/api/prototype/swap/route.ts` | `POST` | route handler | LLM, household data | **none** (`prototypeEnabled()` never called in this function) | **VIOLATION (R2) — BLOCKER** |
| `src/app/api/prototype/ideas/route.ts` | `POST` | route handler | LLM, household data | `prototypeEnabled()` → 404 | EXCEPTION (X2) |
| `src/app/api/prototype/recipe/route.ts` | `POST` | route handler | LLM, household data | `prototypeEnabled()` → 404 | EXCEPTION (X3) |
| `src/app/api/probe/anthropic/route.ts` | `POST` | route handler | LLM, secrets | `authorized()` timing-safe compare, absent secret → 404 | EXCEPTION (X1) |
| `src/app/prototype/page.tsx` | `PrototypePage` | server component | household data (local CSV) | `prototypeEnabled()` → `notFound()` | EXCEPTION (X4) |
| `src/app/prototype/layout.tsx` | `PrototypeLayout` | layout | none (CSS import only) | n/a | OK |
| `src/app/layout.tsx` | `RootLayout` | layout | none | n/a | OK |
| `src/app/page.tsx` | `Home` | server component | none | n/a | OK |
| `src/lib/prototype/quick-key.ts` | `anthropicKeyConfigured` | lib fn (not a route/action, but reads a restricted secret) | secrets | **none** — reads `process.env.ANTHROPIC_API_KEY` directly, outside `src/lib/server/secrets.ts` | **VIOLATION (R4) — BLOCKER** |

## Violations

### V1 — R2 (withAuth on every entry point) + R3 (household from JWT) — BLOCKER — `src/app/actions/cook.ts:1-14`
Evidence: `export async function suggestSwap(householdId: string, ingredient: string) {` (line 6), preceded by `'use server';` (line 1) and `import { callAnthropic } from '@/lib/llm/anthropic';` (line 3), with the LLM called at lines 7-12 with zero guard of any kind — no `withAuth`, no `prototypeEnabled()`, no exceptions-file row, no session check.
Why it matters: this is a live, callable server action that spends LLM/API-key budget for anyone who can invoke it, and it takes `householdId` as a caller-supplied parameter — exactly the R3-prohibited pattern of trusting the client for household scope, since a server action's arguments are attacker-controlled the same way request body fields are.
Fix (not applied): delete this file (it is an unreviewed M4.6 draft — AGENTS.md says M4.6 is explicitly not to be built yet) or gate it behind `prototypeEnabled()`/`withAuth` and derive the household from the session, never from a parameter.

### V2 — R2 (withAuth on every entry point) — BLOCKER — `src/app/api/prototype/swap/route.ts:16-26`
Evidence: `export async function POST(req: NextRequest) {` (line 16) has no call to `prototypeEnabled()` anywhere in its body — `loadPrototypeHousehold()` (line 18) and `callAnthropic()` (line 19) run unconditionally. Contrast with the same file's `GET` (line 11: `if (!prototypeEnabled()) return new Response('not found', { status: 404 });`) and with `ideas/route.ts:37` and `recipe/route.ts:33`, which both guard `POST`.
Why it matters: this path reaches the LLM and reads two real people's health-derived food data with zero guard on any deployed environment, not just locally — the exact BLOCKER class the rule set calls out (LLM/DB/secret reachable with no guard on some path).
Fix (not applied): add `if (!prototypeEnabled()) return new Response('not found', { status: 404 });` as the first line of `POST`, matching `GET` and the other two prototype routes.

### V3 — R1 (service layer sole importer) — DEGRADED — `src/app/api/prototype/swap/route.ts:1-14`
Evidence: `import { callAnthropic } from '@/lib/llm/anthropic';` (line 4) and `import { loadPrototypeHousehold } from '@/lib/prototype/profiles';` (line 6), in a file with no row in `docs/security/auth-boundary-exceptions.md`.
Why it matters: the service layer isn't built, so per the header rule every restricted import outside it is a finding unless allowlisted; this file's shape mirrors X2/X3 but was never added to the exceptions table, so even its `GET` path (which is guarded) is undocumented and its `POST` path is the unguarded BLOCKER above.
Fix (not applied): add a row (or delete the file — it appears to be an unreviewed swap-suggestion draft parallel to `cook.ts`) before it ships past this state.

### V4 — R4 (secrets through one module) — BLOCKER — `src/lib/prototype/quick-key.ts:1-5`
Evidence: `return (process.env.ANTHROPIC_API_KEY ?? '').length > 0;` (line 3), reading `ANTHROPIC_API_KEY` directly rather than through `src/lib/server/secrets.ts`. The file also lacks `import 'server-only'`, present in every other restricted module (`secrets.ts:1`, `llm/anthropic.ts:10`, `prototype/profiles.ts:15`).
Why it matters: Severity rule states a secret read outside `secrets.ts` is a BLOCKER regardless of what it's used for — a single choke point for secret reads is the whole point of R4, and this bypasses it. It is currently unreferenced anywhere in `src/` (grep found only its own definition), so it is dead code, but dead code that violates R4 is still a finding, and its missing `server-only` marker means a future client import of it would leak nothing today only by accident.
Fix (not applied): delete the file (appears to be leftover/unused), or if kept, route it through `anthropicApiKey()`-style boolean check in `secrets.ts` and add `import 'server-only'`.

## Sanctioned exceptions
| Id | File | Guard verified on every path | Expiry | Expired |
|---|---|---|---|---|
| X1 | `src/app/api/probe/anthropic/route.ts` | Yes — `authorized()` (secrets.ts:12-19) is the only path to the fetch call, timing-safe, absent secret → 404 | Delete at M1.4 | No (M1.4 not landed) |
| X2 | `src/app/api/prototype/ideas/route.ts` | Yes — `prototypeEnabled()` is line 1 of `POST` (line 37), only path in the file | Delete at Phase 4 (M4.x) | No |
| X3 | `src/app/api/prototype/recipe/route.ts` | Yes — `prototypeEnabled()` is line 1 of `POST` (line 33), only path in the file | Delete at Phase 4 (M4.x) | No |
| X4 | `src/app/prototype/page.tsx` | Yes — `prototypeEnabled()` → `notFound()` (line 29) runs before any data read | Delete at Phase 4 (M4.x) | No |

R3 note on X2/X3 (diners param): both routes accept `body.diners` from the client but validate it as a subset of the resolved household's own profile ids before use (`ideas/route.ts:44-48`, `recipe/route.ts:44-49`: `dinerIds = requested.filter((id) => allIds.includes(id))`), which is the R3-compliant shape. Household id itself is never accepted from the client in either route — the prototype household is loaded server-side with no id parameter at all.

## Restricted imports outside the service layer
| Module | Importer | Allowlisted |
|---|---|---|
| `@/lib/llm/anthropic` | `src/app/actions/cook.ts` | No — see V1 |
| `@/lib/llm/anthropic` | `src/app/api/prototype/swap/route.ts` | No — see V3 |
| `@/lib/prototype/profiles` | `src/app/api/prototype/swap/route.ts` | No — see V3 |
| `@/lib/llm/anthropic` | `src/app/api/prototype/ideas/route.ts` | Yes (X2) |
| `@/lib/prototype/profiles` | `src/app/api/prototype/ideas/route.ts` | Yes (X2) |
| `@/lib/llm/anthropic` | `src/app/api/prototype/recipe/route.ts` | Yes (X3) |
| `@/lib/prototype/profiles` | `src/app/api/prototype/recipe/route.ts` | Yes (X3) |
| `@/lib/prototype/profiles` | `src/app/prototype/page.tsx` | Yes (X4) |
| `@/lib/server/secrets` | `src/app/api/probe/anthropic/route.ts` | Yes (X1) |

No service-role Supabase client is constructed anywhere in `src/` (grep for `createClient`/`service_role`/`SERVICE_ROLE` in `src/` found only the `supabaseServiceRoleKey()` accessor definition in `secrets.ts:19`, which is unreferenced) — R5 has nothing to check yet.

## Static ban (R6)
`eslint.config.mjs` carries no `no-restricted-imports` rule (full file read: only `nextVitals`, `nextTs`, and a `globalIgnores` block — no import-restriction entries). `scripts/check_client_bundle.sh` greps the built client bundle for secret *value* patterns (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PROBE_SECRET`, key-shaped strings) pre-deploy, but that is a client-leak check, not a static ban on R1's restricted-module imports anywhere in the codebase. No other CI grep for the R1 module list exists (grep for `no-restricted-imports`/`restricted.*import` across the repo matched only this rule-set file and the PRD).
**Status: MINOR** — the ban is absent, but M1.4 (which is when R6 is due) has not landed; AGENTS.md's "In flight" line still reads M1.2. This is the scheduled-gap case, not the DEGRADED post-M1.4 case.

## Scripts reading secrets
| Script | Secret | Local-only guard verified |
|---|---|---|
| `scripts/rls_three_user_test.ts` | `SUPABASE_SERVICE_ROLE_KEY` (line 27) | Yes — lines 32-38: `const LOCAL = /127\.0\.0\.1|localhost/.test(URL); if (!LOCAL) { console.error('Refusing to run fixture setup against a non-local URL.'); process.exit(2); }` |

## Could not determine
None — every route, action, layout, and page in scope was read and traced to its first DB/LLM/secret use or confirmed to have none.

## Commands run
```
git rev-parse --short HEAD
git ls-files
grep (Grep tool) for @/lib/llm/anthropic|@/lib/server/secrets|service_role|SERVICE_ROLE|createClient|@/lib/prototype/profiles|process\.env\. in src/
grep (Grep tool) for process.env.(ANTHROPIC_API_KEY|SUPABASE_SERVICE_ROLE_KEY|PROBE_SECRET) in scripts/
glob src/app/**/route.ts
glob src/app/**/{page,layout}.tsx
grep 'use server' in src/
grep "In flight" AGENTS.md
grep anthropicKeyConfigured|quick-key in src/
grep suggestSwap in src/
grep withAuth in src/
grep no-restricted-imports|restricted.*import (repo-wide)
find middleware.ts / instrumentation.ts (none found)
Read: docs/security/auth-boundary-exceptions.md, src/app/actions/cook.ts, src/app/api/prototype/swap/route.ts, src/lib/prototype/guard.ts, src/lib/prototype/quick-key.ts, src/app/api/prototype/ideas/route.ts, src/app/api/prototype/recipe/route.ts, src/app/api/probe/anthropic/route.ts, src/app/prototype/page.tsx, src/lib/server/secrets.ts, src/lib/llm/anthropic.ts, src/lib/prototype/profiles.ts (partial), src/app/layout.tsx, src/app/page.tsx, src/app/prototype/layout.tsx, eslint.config.mjs, scripts/check_client_bundle.sh, scripts/rls_three_user_test.ts (partial), src/lib/llm/config.ts
```

**Summary for the calling agent:** two new, untracked, unreviewed files — `src/app/actions/cook.ts` (an M4.6-labeled server action AGENTS.md explicitly says not to build yet) and `src/app/api/prototype/swap/route.ts` (its `POST` handler) — reach the LLM with no guard at all, and `cook.ts` takes `householdId` as a directly caller-supplied argument. A third file, `src/lib/prototype/quick-key.ts`, reads `ANTHROPIC_API_KEY` outside `secrets.ts`. These three are BLOCKERs. The `swap/route.ts` `GET` handler and its restricted imports are undocumented in the exceptions file (DEGRADED). R6's static ban is absent but that's a scheduled MINOR gap pre-M1.4. Everything already covered by exceptions X1–X4 checks out — guards verified on every path, no expiry passed, diners validated server-side as a subset of the resolved household. Verdict: FAIL.
