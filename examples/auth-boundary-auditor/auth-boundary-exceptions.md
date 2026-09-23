# Auth-boundary exceptions

Read by the `auth-boundary-auditor` subagent (`.claude/agents/auth-boundary-auditor.md`). An entry point listed here may reach the LLM, secrets, or household data without `withAuth` as long as its fail-closed guard sits on every path and its expiry milestone has not passed. Anything reaching those without a row here is a violation.

**Service layer:** not built (M1.4 pending). Planned path: `src/lib/services/`. Update this line when M1.4 lands.

| Id | File | Reaches | Guard | Expiry | Added |
|---|---|---|---|---|---|
| X1 | `src/app/api/probe/anthropic/route.ts` | LLM, secrets | `authorized()`: `PROBE_SECRET` absent → 404; timing-safe header compare | Delete at M1.4 | M1.1, 2026-07 |
| X2 | `src/app/api/prototype/ideas/route.ts` | LLM, household data (local CSV) | `prototypeEnabled()`: `PROTOTYPE_MODE=1` and `NODE_ENV!=production`, else 404 | Delete at Phase 4 (M4.x) | A1 prototype, 2026-09 |
| X3 | `src/app/api/prototype/recipe/route.ts` | LLM, household data (local CSV) | same as X2 | Delete at Phase 4 (M4.x) | A1 prototype, 2026-09 |
| X4 | `src/app/prototype/page.tsx` | household data (local CSV) | `prototypeEnabled()` → `notFound()` | Delete at Phase 4 (M4.x) | A1 prototype, 2026-09 |

Adding a row is a Kurt decision, recorded in the done report of the move that adds it.
