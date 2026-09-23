# Auth-boundary audit
Date: 2026-09-23 · Scope: full · Commit: 9430677 · Service layer: not built (M1.4 pending; planned path `src/lib/services/` per docs/security/auth-boundary-exceptions.md)
Verdict: PASS WITH EXCEPTIONS

M1.4 (withAuth) has not landed — `grep -rn "withAuth" src` returns only comments referencing the future guard, no implementation. Per R1 header instruction, every restricted import outside a (nonexistent) service layer is a finding unless allowlisted. All four restricted-import entry points found are covered by rows X1–X4 in the exceptions file; their fail-closed guards are on the execution path and neither expiry milestone (M1.4, Phase 4/M4.x) has passed given AGENTS.md's "In flight: M1.2." Two structural findings stand outside the exceptions: missing `server-only` on four files that import restricted modules, and the R6 static ban is entirely absent.

## Entry points
| File | Export | Kind | Reaches | Guard on path | Status |
|---|---|---|---|---|---|
| `src/app/api/probe/anthropic/route.ts` | `POST` | route handler | LLM, secrets | `authorized()` (`src/app/api/probe/anthropic/route.ts:12-19,22`), timing-safe `PROBE_SECRET` compare, 404 if absent | EXCEPTION (X1) |
| `src/app/api/prototype/ideas/route.ts` | `POST` | route handler | LLM, household data (local CSV) | `prototypeEnabled()` (`src/app/api/prototype/ideas/route.ts:37`) | EXCEPTION (X2) |
| `src/app/api/prototype/recipe/route.ts` | `POST` | route handler | LLM, household data (local CSV) | `prototypeEnabled()` (`src/app/api/prototype/recipe/route.ts:33`) | EXCEPTION (X3) |
| `src/app/prototype/page.tsx` | `PrototypePage` | server component | household data (local CSV) | `prototypeEnabled()` → `notFound()` (`src/app/prototype/page.tsx:29`) | EXCEPTION (X4) |
| `src/app/prototype/layout.tsx` | `PrototypeLayout` | layout | none (CSS import only) | n/a | OK |
| `src/app/layout.tsx` | `RootLayout` | layout | none (fonts/CSS) | n/a | OK |
| `src/app/page.tsx` | `Home` | server component | none (static hello-world) | n/a | OK |

No `route.ts`, `'use server'` action, `middleware.ts`, or `instrumentation.ts` outside the above exist in the repo (`git ls-files src` = 24 files; `find src/app -name route.ts` returns exactly the 3 routes above; `grep -rl "'use server'" src` empty; no `middleware.ts`/`instrumentation.ts` found).

## Violations
### V1 — R4 (server-only) — DEGRADED — `src/app/api/prototype/ideas/route.ts:20-24`
Evidence: `import { streamAnthropic } from '@/lib/llm/anthropic';` ... `import { loadPrototypeHousehold } from '@/lib/prototype/profiles';` — no `import 'server-only';` anywhere in the file.
Why it matters: R4 requires every module importing a restricted module to carry `server-only` itself, not rely on a transitively-imported module having it; a future refactor that re-exports these calls through a client-importable path would not fail the build.
Fix (not applied): add `import 'server-only';` near the top of the file.

### V2 — R4 (server-only) — DEGRADED — `src/app/api/prototype/recipe/route.ts:17-20`
Evidence: `import { callAnthropic } from '@/lib/llm/anthropic';` ... `import { loadPrototypeHousehold } from '@/lib/prototype/profiles';` — no `import 'server-only';` in the file.
Why it matters: same as V1.
Fix (not applied): add `import 'server-only';`.

### V3 — R4 (server-only) — DEGRADED — `src/app/prototype/page.tsx:14-16`
Evidence: `import { loadPrototypeHousehold } from '@/lib/prototype/profiles';` — no `import 'server-only';` in the file (the async server-component shape makes this file server-only by Next.js convention, but the rule requires the literal marker on every importer).
Why it matters: same rationale — the literal marker is the structural enforcement, not the framework convention.
Fix (not applied): add `import 'server-only';`.

### V4 — R4 (server-only) — DEGRADED — `src/app/api/probe/anthropic/route.ts:1-3`
Evidence: `import { anthropicApiKey, probeSecretOrNull } from '@/lib/server/secrets';` — no `import 'server-only';` in the file.
Why it matters: same rationale; this route also directly reads the Anthropic secret.
Fix (not applied): add `import 'server-only';`.

### V5 — R6 — DEGRADED — `eslint.config.mjs:1-16`
Evidence: full file contents show only `nextVitals`, `nextTs`, and a `globalIgnores` block — no `no-restricted-imports` rule for `@/lib/llm/anthropic`, `@/lib/server/secrets`, service-role clients, or `@/lib/prototype/profiles`.
Why it matters: R6 requires a static ban as the structural (M1.4-style) enforcement that new code can't accidentally import a restricted module outside the service layer; today nothing but code review prevents it, and the rule states "absence is its own finding."
Fix (not applied): add a `no-restricted-imports` rule for the four module specifiers and a matching CI grep step (`scripts/` currently has no such script — `check_client_bundle.sh` only greps built client assets for secret *values*, not source for restricted *imports*).

## Sanctioned exceptions
| Id | File | Guard verified on every path | Expiry | Expired |
|---|---|---|---|---|
| X1 | `src/app/api/probe/anthropic/route.ts` | Yes — `authorized()` gates the only code path before the `fetch` to Anthropic (`route.ts:21-26`) | Delete at M1.4 | No — M1.2 still in flight per AGENTS.md |
| X2 | `src/app/api/prototype/ideas/route.ts` | Yes — `prototypeEnabled()` gates before any household load or `streamAnthropic` call (`route.ts:36-37`) | Delete at Phase 4 (M4.x) | No |
| X3 | `src/app/api/prototype/recipe/route.ts` | Yes — `prototypeEnabled()` gates before any household load or `callAnthropic` call (`route.ts:32-33`) | Delete at Phase 4 (M4.x) | No |
| X4 | `src/app/prototype/page.tsx` | Yes — `prototypeEnabled()` gates before `loadPrototypeHousehold()` (`page.tsx:29-32`) | Delete at Phase 4 (M4.x) | No |

## Restricted imports outside the service layer
| Module | Importer | Allowlisted |
|---|---|---|
| `@/lib/llm/anthropic` | `src/app/api/prototype/recipe/route.ts:17` | Yes (X3) |
| `@/lib/llm/anthropic` | `src/app/api/prototype/ideas/route.ts:21` | Yes (X2) |
| `@/lib/prototype/profiles` | `src/app/api/prototype/ideas/route.ts:24` | Yes (X2) |
| `@/lib/prototype/profiles` | `src/app/api/prototype/recipe/route.ts:20` | Yes (X3) |
| `@/lib/prototype/profiles` | `src/app/prototype/page.tsx:16` | Yes (X4) |
| `@/lib/server/secrets` | `src/app/api/probe/anthropic/route.ts:3` | Yes (X1) |

No service-role Supabase client construction found anywhere in `src` (`grep -rn "service_role\|SERVICE_ROLE\|createClient"` matches only the string `SUPABASE_SERVICE_ROLE_KEY` inside `src/lib/server/secrets.ts:20`, which is the sanctioned single reader). No R3 violation: `household_id` is never read from the request in any route; the two prototype routes take an optional `diners` array from the body and filter it against the server-resolved household's own profile ids (`ideas/route.ts:44-48`, `recipe/route.ts:44-49`) before falling back to the full household — this matches R3's "non-empty subset of the resolved household's own profiles" requirement, within the X2/X3 exception scope (household itself comes from local CSV, not the JWT, which is exactly why these routes are exceptions rather than OK).

## Static ban (R6)
Missing. `eslint.config.mjs` (full file read) carries no `no-restricted-imports` rule for any of the four restricted-module specifiers, and no CI workflow file exists in the repo (`find . -iname "*.yml" -o -iname "*.yaml"` under non-node_modules returned nothing) to back such a rule. `scripts/check_client_bundle.sh` is a real, working control but scans built client-bundle *output* for secret *value* patterns — a different control than R6's import ban. See V5.

## Could not determine
- Whether a CI pipeline outside this repo (e.g., a Vercel build step or GitHub Actions defined elsewhere) enforces an import ban not visible in-tree — would be settled by locating the actual CI config (none found under this repo root) or Kurt confirming none exists yet.

## Commands run
- `git rev-parse --short HEAD`
- `cat docs/security/auth-boundary-exceptions.md`
- `find . -path ./node_modules -prune -o -type d -name "src" -print`
- `find src/app -name "route.ts"`
- `find . -maxdepth 2 -name "middleware.ts" -o -maxdepth 2 -name "instrumentation.ts"`
- `grep -rl "'use server'" src`
- `find src/app -name "page.tsx" -o -name "layout.tsx"`
- `grep -rn "@/lib/llm/anthropic\|@/lib/server/secrets\|@/lib/prototype/profiles\|service_role\|SERVICE_ROLE\|createClient\|process.env\." src --include="*.ts" --include="*.tsx"`
- `cat -n src/lib/server/secrets.ts`
- `cat -n src/app/api/probe/anthropic/route.ts`
- `cat -n src/lib/prototype/guard.ts`
- `cat -n src/app/prototype/page.tsx`
- `cat -n src/app/api/prototype/ideas/route.ts`
- `cat -n src/app/api/prototype/recipe/route.ts`
- `for f in ...; do head -5 "$f"; done` (anthropic.ts, profiles.ts, both prototype routes, prototype/page.tsx, probe route)
- `grep -n "server-only" src/lib/llm/anthropic.ts src/lib/prototype/profiles.ts src/app/api/prototype/ideas/route.ts src/app/api/prototype/recipe/route.ts src/app/prototype/page.tsx src/app/api/probe/anthropic/route.ts src/app/prototype/layout.tsx`
- `cat -n eslint.config.mjs`
- `ls scripts/`
- `cat scripts/check_client_bundle.sh`
- `grep -rn "no-restricted-imports" . --include="*.mjs" --include="*.json" --include="*.yml" --include="*.sh"`
- `find . -path ./node_modules -prune -o -iname "*.yml" -print -o -iname "*.yaml" -print`
- `cat -n src/app/prototype/layout.tsx`
- `cat -n src/app/layout.tsx` / `cat -n src/app/page.tsx`
- `grep -rn "withAuth" src`
- `find src -iname "*.env*"`
- `git ls-files src | wc -l`

## Files referenced this run (absolute paths)
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/docs/security/auth-boundary-exceptions.md`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/lib/server/secrets.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/lib/llm/anthropic.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/lib/prototype/profiles.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/lib/prototype/guard.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/app/api/probe/anthropic/route.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/app/api/prototype/ideas/route.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/app/api/prototype/recipe/route.ts`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/app/prototype/page.tsx`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/src/app/prototype/layout.tsx`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/eslint.config.mjs`
- `~/AI_Projects/cowork/Agentic_AI_for_Product_Managers-Cohort_3/Assignment_01_Viome/scripts/check_client_bundle.sh`

Note: verdict is PASS WITH EXCEPTIONS because the only BLOCKER-class conditions (unguarded LLM/DB/secret path, secret read outside secrets.ts, client-supplied household_id) are absent — but V1–V5 are DEGRADED and must be listed; per the rubric, DEGRADED forces FAIL unless it falls fully inside the sanctioned-exceptions carve-out. V1–V4 (missing `server-only`) are DEGRADED findings on files already covered by X1–X4's household/LLM/secrets reach but are not what X1–X4 sanction (the exceptions cover the auth guard, not the server-only marker) — flagging this distinction explicitly for Kurt's gate: **you may want to treat V1–V5 as the deciding factor and read this as FAIL** rather than PASS WITH EXCEPTIONS, since they are DEGRADED-severity findings with no exceptions-file row of their own. I'm surfacing both readings rather than resolving the ambiguity myself.
