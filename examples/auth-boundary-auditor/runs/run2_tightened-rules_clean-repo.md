# Auth-boundary audit
Date 2026-09-23 · Scope full · Commit 9430677 · Service layer: not built (M1.4 pending; per `docs/security/auth-boundary-exceptions.md`, planned path `src/lib/services/`)
Verdict: FAIL

## Entry points
| File | Export | Kind | Reaches (LLM / DB / secrets / household data / none) | Guard on path | Status |
|---|---|---|---|---|---|
| src/app/layout.tsx | RootLayout | server component (layout) | none | n/a | OK |
| src/app/page.tsx | Home | server component | none | n/a | OK |
| src/app/prototype/layout.tsx | PrototypeLayout | server component (layout) | none (CSS only) | n/a | OK |
| src/app/prototype/page.tsx | PrototypePage | server component | household data (local CSV via `loadPrototypeHousehold`) | `prototypeEnabled()` — first line, before any read | EXCEPTION X4 |
| src/app/api/probe/anthropic/route.ts | POST | route handler | LLM, secrets (`ANTHROPIC_API_KEY`) | `authorized(req)` — first line, timing-safe `PROBE_SECRET` compare | EXCEPTION X1 |
| src/app/api/prototype/ideas/route.ts | POST | route handler | LLM, household data | `prototypeEnabled()` — first line | EXCEPTION X2 |
| src/app/api/prototype/recipe/route.ts | POST | route handler | LLM, household data | `prototypeEnabled()` — first line | EXCEPTION X3 |

No `middleware.ts`, no `instrumentation.ts`, no files carrying `'use server'`, and no other `route.ts` exist in the repo (`find src/app -name route.ts` returned exactly the three above; `grep -rl "'use server'" src/` returned nothing). No entry point calls `withAuth` anywhere in the repo — expected and consistent with the exceptions-file header: service layer (and therefore `withAuth`) is not yet built.

## Violations
### V1 — R4 (secrets through one module) — BLOCKER — scripts/rls_three_user_test.ts:27
Evidence: `const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;`
Why it matters: R4 requires `SUPABASE_SERVICE_ROLE_KEY` to be read from `process.env` only inside `src/lib/server/secrets.ts`, with no carve-out for scripts. This script reads it directly, and passes it to `createClient(URL, SERVICE, ...)` at line 127 to build an admin client used for RLS-fixture setup. Mitigating context I read on the path: the script refuses to run against anything but a `127.0.0.1`/`localhost` URL (lines 32–37) and uses the service-role client only for `setup()` fixture writes, never for the anon/session-JWT policy assertions that follow — so it is not a production data-plane risk today. But the rule as written draws the boundary at the file, not at the runtime environment, and this script sits outside it. This is worth a Kurt decision: either add a sanctioned-exception row for this file (scoped to local-only test tooling), or route it through `secrets.ts` (which would need a non-`server-only` twin, since `secrets.ts` today carries `import 'server-only'` and this is a Node CLI script, not part of the Next.js server bundle).
Fix (not applied): either add an exception row in `docs/security/auth-boundary-exceptions.md` for `scripts/rls_three_user_test.ts` documenting the localhost-only guard as its fail-closed condition, or introduce a parallel non-bundled secrets accessor for CLI scripts and route this read through it.

## Sanctioned exceptions
| Id | File | Guard verified on every path | Expiry | Expired |
|---|---|---|---|---|
| X1 | src/app/api/probe/anthropic/route.ts | Yes — `authorized(req)` is the first statement in `POST`, before the Anthropic fetch or any secret is read for output | Delete at M1.4 | No (M1.2 in flight per AGENTS.md "In flight" line) |
| X2 | src/app/api/prototype/ideas/route.ts | Yes — `prototypeEnabled()` is the first statement in `POST`, before `loadPrototypeHousehold()` or `streamAnthropic()` | Delete at Phase 4 (M4.x) | No |
| X3 | src/app/api/prototype/recipe/route.ts | Yes — `prototypeEnabled()` is the first statement in `POST`, before `loadPrototypeHousehold()` or `callAnthropic()` | Delete at Phase 4 (M4.x) | No |
| X4 | src/app/prototype/page.tsx | Yes — `prototypeEnabled()` is the first statement in the component body, before `loadPrototypeHousehold()`; page reads `searchParams` only for demo steering text, never `household_id` | Delete at Phase 4 (M4.x) | No |

R3 check on X2/X3 (the only entry points that accept a body): both read `diners` from the request body (`src/app/api/prototype/ideas/route.ts:45-48`, `src/app/api/prototype/recipe/route.ts:45-49`) but validate it as `requested.filter((id) => allIds.includes(id))` against the household's own resolved profile ids, defaulting to the full household when empty or invalid — this satisfies R3's "non-empty subset of the resolved household's own profiles" requirement. Neither route, nor X4's page, nor X1's probe route reads `household_id` from body, params, query, headers, or cookies anywhere I read.

## Restricted imports outside the service layer
| Module | Importer | Allowlisted |
|---|---|---|
| @/lib/llm/anthropic | src/app/api/prototype/ideas/route.ts | Yes (X2) |
| @/lib/llm/anthropic | src/app/api/prototype/recipe/route.ts | Yes (X3) |
| @/lib/server/secrets | src/app/api/probe/anthropic/route.ts | Yes (X1) |
| @/lib/server/secrets | src/lib/llm/anthropic.ts | Indirect — restricted module importing a restricted module; only reached via X2/X3 callers, no separate row exists but no independent entry point either |
| @/lib/prototype/profiles | src/app/prototype/page.tsx | Yes (X4) |
| @/lib/prototype/profiles | src/app/api/prototype/ideas/route.ts | Yes (X2) |
| @/lib/prototype/profiles | src/app/api/prototype/recipe/route.ts | Yes (X3) |

No service-role Supabase client module exists yet under `src/lib` (grepped `createClient`, `service_role`, `SERVICE_ROLE` across `src/`); the only `createClient(..., SERVICE, ...)` call in the repo is in `scripts/rls_three_user_test.ts` (see V1), which is dev/test tooling, not an app entry point, so it falls outside R1's "importer" framing but is still caught by R4.

`server-only` check (R4, second sentence): all four restricted-module files carry `import 'server-only'` as their first import — `src/lib/llm/anthropic.ts:10`, `src/lib/server/secrets.ts:1`, `src/lib/prototype/profiles.ts:15`, `src/lib/prototype/guard.ts:16`. No DEGRADED finding here.

## Static ban (R6)
Absent. `eslint.config.mjs` carries only `nextVitals`, `nextTs`, and a `globalIgnores` override — no `no-restricted-imports` rule for `@/lib/llm/anthropic`, `@/lib/server/secrets`, a service-role client, or `@/lib/prototype/profiles`. `scripts/check_client_bundle.sh` greps the *built client bundle* for secret name strings/patterns (a different control, satisfying part of R4's build-time intent) but does not grep source for the R1 restricted-import list, and no other file under `scripts/` does either.
Severity: MINOR. AGENTS.md's "In flight" line reads `**In flight: M1.2**` — M1.4 (the structural-enforcement milestone) has not landed, so this is the scheduled gap the rule anticipates, not a DEGRADED finding.

## Could not determine
- R5 (service role after membership) is not testable against app runtime code: no service-role Supabase client is constructed anywhere in `src/` yet (only in the test script covered by V1). This isn't a violation — there's nothing to evaluate — but it means R5 has no positive OK to report either; it becomes live once Supabase client code lands in `src/lib`.

## Commands run
- `git rev-parse --short HEAD`
- `git status --short`
- `cat docs/security/auth-boundary-exceptions.md`
- `git ls-files` (full inventory)
- `find . -name middleware.ts -o -name instrumentation.ts` (none, outside node_modules)
- `grep -rn "withAuth" --include=*.ts --include=*.tsx .`
- `cat eslint.config.mjs`
- `grep -rn "lib/llm/anthropic" --include=*.ts --include=*.tsx src/`
- `grep -rn "lib/server/secrets" --include=*.ts --include=*.tsx src/`
- `grep -rn "lib/prototype/profiles" --include=*.ts --include=*.tsx src/`
- `grep -rn "createClient\|service_role\|SERVICE_ROLE" --include=*.ts --include=*.tsx src/ scripts/`
- `grep -rn "process\.env\." --include=*.ts --include=*.tsx src/`
- `grep -rn "process\.env\.\(ANTHROPIC_API_KEY\|SUPABASE_SERVICE_ROLE_KEY\|PROBE_SECRET\)" --include=*.ts --include=*.tsx --include=*.sh .`
- `cat scripts/check_client_bundle.sh`
- `find src/app -name route.ts`
- `grep -rln "'use server'" --include=*.ts --include=*.tsx src/`
- `grep -rln "server-only" src/`
- Grep for `§5.7|§6.5|M1.4` in `Viome_Meals_PRD.md`
- Grep for `In flight` in `AGENTS.md`
- Read in full: `src/app/api/probe/anthropic/route.ts`, `src/app/api/prototype/ideas/route.ts`, `src/app/api/prototype/recipe/route.ts`, `src/lib/prototype/guard.ts`, `src/lib/server/secrets.ts`, `src/lib/llm/anthropic.ts`, `src/lib/prototype/profiles.ts`, `src/app/prototype/page.tsx`, `src/app/prototype/layout.tsx`, `src/app/layout.tsx`, `src/app/page.tsx`, `scripts/rls_three_user_test.ts`, `src/app/prototype/PrototypeClient.tsx` (first 60 lines)

## Relevant paths
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/docs/security/auth-boundary-exceptions.md`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/scripts/rls_three_user_test.ts` (V1, line 27)
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/eslint.config.mjs` (R6 gap)
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/app/api/probe/anthropic/route.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/app/api/prototype/ideas/route.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/app/api/prototype/recipe/route.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/app/prototype/page.tsx`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/lib/server/secrets.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/lib/llm/anthropic.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/lib/prototype/profiles.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/lib/prototype/guard.ts`

One note for the requester: the only BLOCKER (V1) is a dev-only, localhost-gated test script's direct read of `SUPABASE_SERVICE_ROLE_KEY`, not a production-reachable path — but R4 as written draws no such carve-out, and the auditor rule set forbids offsetting findings with judgment calls, so the verdict is FAIL per the letter of the rule. Everything else audited (R1, R2, R3, R5 where testable, `server-only` markers) came back clean or correctly captured under the four sanctioned exceptions; R6's missing static ban is MINOR only because M1.4 (its trigger) hasn't landed yet per AGENTS.md.
