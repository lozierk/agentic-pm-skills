# auth-boundary-auditor

A Claude Code **subagent**, not a skill. Built for Module 3 of *Agentic AI for Product Managers* (Cohort 3, September 2026). It audits the Viome Meals repo against its structural auth boundary and returns a fixed-format report with a one-line verdict. It reads and reports. It never edits.

The live copy runs project-scoped inside the Viome Meals repo (private). This folder is the same three files plus the test runs, so a reader can see the agent, the allowlist it reads, the script that checks its verdict, and what it returned.

## Files

| File | What it is |
|---|---|
| `auth-boundary-auditor.md` | The agent: front matter (model, tools, calling conditions), six rules, severity scale, verdict rule, process, and the exact report format. Lives at `.claude/agents/` in the target repo. |
| `auth-boundary-exceptions.md` | The allowlist the agent reads: sanctioned entry points, their fail-closed guard, and the milestone at which each expires. Lives at `docs/security/` in the target repo. |
| `auth_boundary_verdict.mjs` | Node script, no dependencies. Recomputes the verdict from a report's findings and exits 1 if the report's own Verdict line disagrees. The rule is code, not model judgment. |
| `runs/run1` to `run4` | Four headless runs, verbatim, with absolute paths scrubbed to `~/`. Runs 1 and 2 exposed defects in the rule set. Run 3 passed the clean repo. Run 4 caught all three planted violations. |
| `runs/verdict_script_output.txt` | The script run over all four reports. Run 1 is the mismatch it exists to catch. |
| `runs/planted_violations/` | The three files planted for run 4, named by their repo path with `__` for `/`. |

## Reuse

The rules are specific to one repo's PRD. To adapt: rewrite the six rules and the restricted-module list for your codebase, keep the report format and the verdict rule, and keep the script. The pattern that transfers is the shape: withhold the builder's context, fix the output format, take away the Edit tool, and check the verdict with code.

Run headless from the repo root with the agent installed:

```
claude -p "Use the auth-boundary-auditor subagent. Scope: full." \
  --allowedTools "Read,Grep,Glob,Bash(git ls-files:*),Bash(git diff:*),Bash(git rev-parse:*),Bash(grep:*),Bash(find:*),Bash(ls:*),Bash(cat:*),Bash(head:*)" \
  > report.md
node auth_boundary_verdict.mjs report.md
```

The write-up for the course submission, with the rejected candidates and what each run taught, is on the project's Notion page.
