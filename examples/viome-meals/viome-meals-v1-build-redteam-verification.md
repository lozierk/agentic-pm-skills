# Red-Team Verification — PRD rev 5

**Date:** 2026-07-06  
**Reviewer:** Codex Red-Team Review #2  
**Verdict:** **AMEND**

Reviewed within the requested scope: PRD rev 5, Appendix A/B/C, the Cycle 2 red-team report,
the resolved ledger, and the pre-red-team wargame as a diff reference. I specifically checked
the rev-5 alias flow (§3.1, §5.2, §5.7, §7.1, M4.5), meal-scope/diner-set threading (§1,
§1.1, §4.3, M6.3), mobile-first requirements (§1, M5.2), Phase 2 ordering, and the shared
sections changed by multiple findings.

## 1. Disposition table

| # | Verdict | Verification |
|---|---|---|
| F1 | RESOLVED | Phase 2 now gates promotion on reviewed `food_attributes`: §5.6 and M2.1-M2.3 put taxonomy/seed/review before `complete`, with a missing-record test. |
| F2 | RESOLVED | Diner sets are threaded through §4.3, §5.1, §5.7 save gate, §7.3 metadata, M3.1, M4.4, M5.2, and M6.3; solo-save/full-household recompute is explicit. |
| F3 | RESOLVED | `llm_configs` is now a first-class precondition in §6.2, §5.7, §7.1, and M4.0, including invalid-config rejection and version echo. |
| F4 | RESOLVED | The missing lazy alias workflow is now present: misses are logged, `propose_alias`/`resolve_alias` exist, and M4.5 replaces the prebuilt-table path. |
| F5 | RESOLVED | Stage 1 is now per-card NDJSON/SSE envelopes with per-card schema validation/scoring in §5.1 and M4.2. |
| F6 | RESOLVED | M0.3 covers ignored `Data/`, extraction byproducts, scratch paths, and secret/PII scans before first commit; M2.4 keeps byproducts ignored. |
| F7 | RESOLVED | M1.1 pins Node, package manager, scaffold flags, Supabase CLI, Vercel settings, and lockfile. |
| F8 | RESOLVED | M4.2/M6.2 define a scripted latency harness with N >= 20/class, warm/first-prefix/cold split, and first-card/all-cards timing. |
| F9 | RESOLVED | M3.1 reframes scorer risk around diner-set propagation; empty-set handling is one matrix row rather than the center of gravity. |
| F10 | RESOLVED | §5.6 and M2.2 use cross-vendor generation plus deterministic audits, sentinel foods, block-lists, and false-negative hunts. |
| F11 | RESOLVED | §5.1 requires prominent provisional coverage and composite ingredients staying Unrated; M4.2 adds composite-forcing smoke prompts. |
| F12 | RESOLVED | §1.1 and M4.2/M6.2 separate warm-prefix, first-call-after-prefix-change, and cold-start classes. |
| F13 | RESOLVED | §5.7 and M1.4 make the service layer the sole importer of Anthropic/service-role/household readers, backed by lint/grep and exported-function abuse sweeps. |
| F14 | RESOLVED | §5.6 and M2.2 require durable review evidence: notes/challenges, sentinel confirmations, and a post-approval backcheck. |
| F15 | RESOLVED | §7.5 and M2.5 move signed-URL safety into server-constructed paths from owned import rows and add sibling/traversal probes. |
| F16 | RESOLVED | M3.3 now mutates thresholds, point values, and labels independently and checks server payload plus rendered UI. |
| F17 | RESOLVED | Standing rule 4 and M0.2 split owner-only attestations from executor-runnable probes. |
| F18 | RESOLVED | Appendix A supersedes the stale wargame; M0.1 says rev-5 state is loaded and A3/A6 are retired in Appendix B. |
| F19 | RESOLVED | §5.6/M2.2 replace review speed as a signal with observable artifact-quality triggers. |
| F20 | RESOLVED | A7 and M4.0 prevent any generation feature from being called done before a real authenticated call through resolved config. |
| F21 | RESOLVED | A4 is narrowed to unpreservable safety-invariant contradictions, with UI-state ambiguities handled by state table/owner confirmation only when needed. |
| F22 | RESOLVED | A8 makes the end-to-end §6.5 acceptance script mandatory; inability to run it means the build is not done. |
| F23 | RESOLVED | M5.1 makes Impeccable optional/non-gating, with a revert path if it conflicts. |
| F24 | RESOLVED | M4.1 now relies on observed current-SDK cache-read evidence, not hardcoded TTL or usage-field names. |
| F25 | RESOLVED | M1.3 adds a production cleanup test and makes any permanent auth-method change an owner decision. |
| F26 | RESOLVED | Appendix A standing rule 1 turns safeguards into checked-in tests/scripts whose printed outputs are required in done reports. |
| F27 | RESOLVED | M1.2 uses anon/session clients only, negative tests per table/storage path, explicit `search_path` inspection, and M3.2 fail-closed mutation testing. |
| F28 | PARTIAL | Boundary tests, match-rate reporting, and the "Not sure" affordance exist, but the fail-safe lacks a durable data-model state and can re-prompt or collapse into rejection; see V2. |
| F29 | RESOLVED | §6.5 and M6.1 require the script to print test-user id, no-membership proof, all four abuse failures, and zero Anthropic usage. |

## 2. New findings

**V1. §3.1 / §4.6 / §7.3 / M4.5 — Alias revocation cannot actually "re-heal on read" with the current stored-match model — Severity: BLOCKER — Suggested fix:** `recipe_ingredients` stores only `matched_food_name` and `match_status`, while §7.3 says re-scoring is a pure join with no re-matching. If an approved alias writes a target `matched_food_name`, revoking that alias leaves the stored target in place and future reads keep scoring the wrong food. If approval does not write/update affected rows, then point-of-miss approval does not immediately fix the current row. Add explicit match provenance (`match_source`, `alias_id` or `miss_id`, resolved version/timestamp) and define read-time behavior: alias-backed rows score only while the alias is approved; rejected/revoked/not-sure aliases render Unrated. Add tests for approve -> matched and revoke -> Unrated on the same saved recipe.

**V2. §3.1 / §5.7 / §7.1 / M4.5 — "Not sure" is specified as a UI option but not as durable state — Severity: DEGRADED — Suggested fix:** `resolve_alias(alias_id, decision)` accepts not-sure, but `food_aliases.status` only has `proposed | approved | rejected | revoked`. Leaving the row unmatched without persisting the decision means the same candidate can keep appearing, turning the fail-safe into repeated pressure to approve. Treating not-sure as rejected loses the distinction between "wrong" and "I cannot safely decide from this context." Add a durable `not_sure`/`deferred`/per-miss dismissal state with actor, timestamp, and evidence; hide it from the primary row until reopened or new evidence exists; test that tapping "Not sure" leaves the ingredient Unrated and does not immediately re-prompt.

**V3. §3.1 / §5.2 / M4.5 / M5.2 — The mobile point-of-miss approval path lacks guardrails against casual household-wide mis-approval — Severity: DEGRADED — Suggested fix:** Rev 5 moves safety-adjacent alias approval onto an iPhone/in-store flow, allows any household member to approve, and applies approval immediately household-wide. The spec says target ratings and a "Not sure" option are shown, but it does not require mobile tests proving the source ingredient text, recipe context, proposed target, both ratings, and reject/not-sure actions are all visible and reachable without accidental approve. Boundary examples such as "shallot" -> "Onion" are useful regression tests, but the general semantic boundary is still human judgment, not code enforcement. Amend M5.2/M4.5 with an iPhone alias-resolution fixture: no preselected/default approve, "Not sure" and reject equally reachable, source evidence visible before approve, approval copy says "same food, not a substitute," and a visible undo/revoke/audit path exists.

No additional scoped defects found in the meal-scope/diner-set threading. Rev 5 consistently treats Breakfast/Lunch/Dinner/Snacks as first-class and keeps meal type orthogonal to diner set. No general desktop-only assumption found for user-facing flows outside the alias-resolution mobile guardrail gap above; operator/import/config flows are correctly desk-based by design.

## 3. Overall verdict

**AMEND** — The Cycle 2 dispositions mostly hold, but F28 is only partial and rev 5 introduced
three alias-flow defects. V1 must be fixed before build because it contradicts the revocation
safety claim and can preserve known-wrong matches. V2 and V3 should be patched in the same
alias amendment so the "Not sure" fail-safe and mobile point-of-miss approval are real, not
just well-intentioned UI copy. No owner-escalation **BLOCKER** is required unless the amendment
changes the product decision that any household member may approve aliases.
