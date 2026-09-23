# agentic-pm-skills

![A samurai kneels at a low table by lantern light, studying a hand-drawn battle map marked with stones. Armor and sword rest unused against the wall.](assets/banner.jpg)

*Fight the build on paper before anything is built.*

Claude Code skills for product managers who build with agents. Written for the Maven course *Agentic AI for Product Managers* (Cohort 3, September 2026) and open to anyone.

A skill is a folder with a `SKILL.md` file. The file tells Claude Code what the task is, when to do it, the steps in order, and what "done" looks like. Reference files next to it hold the detail Claude reads only when a step needs it.

## The skills

| Skill | What it does | Read first |
|---|---|---|
| `spec-wargaming` | Hardens a PRD before any code is written. Claude simulates the build move by move, logs every unknown to a ledger, then hands a package to a different vendor's model for a red team. The findings fold back into the PRD as a battle plan with abort conditions. | `spec-wargaming/SKILL.md` |
| `course-submission` | Turns the end of a course week into one process: read the brief, gather only evidence that exists, write the submission in the brief's own structure, publish a cover page, hand you a post to paste, archive. Stops for your review before anything publishes. | `course-submission/SKILL.md` |

The `examples/viome-meals/` folder holds a complete spec-wargaming run on a real project: the mission brief, the 23-move wargame, the ledger, the 29-finding external red team, and the verification pass. Two personal email addresses are masked. Nothing else is changed.

The `examples/auth-boundary-auditor/` folder holds a Claude Code subagent from Module 3: a read-only auth-boundary auditor, the allowlist it reads, a script that recomputes its verdict, and four test runs including one against planted violations. Its `README.md` explains how to adapt it.

## Install as a Claude Code plugin

```
claude plugin marketplace add lozierk/agentic-pm-skills
claude plugin install agentic-pm-skills@agentic-pm
```

Then type `/spec-wargaming` or `/course-submission` in any session. For `course-submission`, copy `course-submission/config.example.md` to `config.md` in the same folder and fill in your values.

## Use without Claude Code

Every file here is plain markdown. Open `spec-wargaming/references/01-wargame.md` and paste it, with your spec, into any capable model to run the wargame stage. Paste `02-redteam.md` with the wargame output into a different vendor's model for the red team. The stage files are written to work as standalone prompts.

## Two rules these skills share

1. **The red team is not the model that wrote the plan.** A model reviewing its own family's work shares its blind spots. Stage 3 of spec-wargaming hands off to another vendor on purpose. The example run shows three bugs that crossing vendors caught.
2. **The process is fixed, the judgment stays with you.** The wargame stops for the ledger. The submission stops for your review. Neither skill clicks an irreversible button.

## Contributing

Open an issue with the skill name and what happened. Pull requests welcome for edge cases you hit; keep `SKILL.md` short and push detail into `references/`.

## Credits

Banner illustration generated with Kimi from a prompt by Kurt Lozier and Claude, 2026-09-16; the prompt is in `assets/banner-prompt.md`. `assets/social-preview.jpg` is the 1280 by 640 crop for the repository's social preview.

## License

MIT. Copy, adapt, ship.
