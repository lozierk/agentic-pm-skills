# Publishing reference

Notion and Drive mechanics, the two page shapes, and edge cases for `course-submission`. Reached from `SKILL.md` steps 2, 6, and 8.

## Page shapes

A brief drives one of two shapes for the local doc's headings (step 2 of `SKILL.md` decides which).

### Question-driven

The brief poses numbered questions. Headings mirror the questions verbatim, in order, followed by a Demo heading and any additional cover section the brief asks for (for example a PRD cover summary). The A1 submission for this course used this shape: four question headings, a Demo heading covering the Loom and GitHub links and what the prototype does and does not do, then a Part B PRD cover with Problem, Users, What it does, How scoring works, Architecture, Data model, Security and privacy, Non-goals, and Status.

### Evidence-driven

The brief poses a rubric or a deliverable list. Headings follow the brief's own order: required items first, then optional items. The FDE A1 submission used this shape, in this order: a status callout (course, cohort, assignment, author, build agent, due date, one-line what-it-is), a second status callout (submitted state, timestamp, links), a provenance blockquote, a five-minute-read section, an architecture table (piece, what, why), a measured-results section (gate, target, measured, result tables), a model-split section (decision plus a measured table and a lesson callout), a lessons section (numbered, each symptom, measurement, fix, result), a what-I-gave-up table (deferred, why), a how-I-ran-it table (choice, value), and a submission table (item, link).

## Notion publishing mechanics

- `insert_content` silently mangles large multi-block markdown: headings and tables land as literal text. Use `update_content` anchored on trailing text to append instead, and re-fetch the page after every bulk write to confirm it rendered.
- Use `replace_content` only for small pages.
- Long pages need chunked anchored appends: split the content into pieces and append each on its own anchored call rather than sending the whole page at once.
- Images: create a file upload, then POST it with one `curl -F file=@…` call (20 MiB or under), and reference it in the page as `<image src="file-upload://ID">`.
- A `~` in prose must not be escaped.
- Mermaid diagrams render in Notion but not in Maven. Post a link to the Notion page for a diagram; never paste the diagram into Maven.

## Maven editor

The submission form is a rich-text editor with two buttons, "Post to project channel" and "Submit project", that do different things. When asked to fill it, paste the blurb as plain lines with one link per line, confirm each link rendered as a link, and stop. The author chooses the button.

The editor is ProseMirror. Verified 2026-09-16: browser-automation typing and synthetic Enter keys do not reach it. What works is a JavaScript paste event on the `.ProseMirror[contenteditable="true"]` element with the blurb as `text/plain`. ProseMirror splits it into one paragraph per line, auto-links URLs, and drops empty lines, so the author adds blank lines between paragraphs by hand if wanted. Select the editable element by its contenteditable attribute: the assignment description on the same page is also a ProseMirror node, read-only.

## Drive archive

`create_file` needs inline base64 for binaries. Upload images to Drive by hand rather than through the API.

## Scrub list (public copies)

Before any copy of a doc leaves the machine, scrub:
- Supabase project references
- Notion page ids of private pages
- Vercel hostnames
- Personal email addresses (they appear in OAuth test-user lists and ledgers)
- Third-party names that `config.md` has not cleared

## Edge cases

- **Locked assignment page.** If the brief is not yet visible on Maven, ask Kurt to paste the brief text instead of waiting on access.
- **Brief with both questions and a rubric.** Question-driven wins for headings; the rubric items become a checklist inside the Demo or Evidence heading.
- **A week with no new artifact.** The submission is the explanation plus links to what already exists. Say so plainly in the doc rather than manufacturing a Demo section.
- **Notion insert_content mangling and long pages.** Covered above under Notion publishing mechanics.
