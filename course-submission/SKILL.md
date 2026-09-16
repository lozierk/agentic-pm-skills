---
name: course-submission
description: Turn a finished week of course work into the submission package (local markdown, a Notion cover page under the project home, and a Maven post blurb) from the assignment brief and the project's evidence.
disable-model-invocation: true
---

# course-submission

Every week of a Maven course ends the same way: read the brief, gather what was built, write it up in the brief's own structure, publish to Notion under the project home, post a blurb on Maven, archive to Drive. This skill makes that a repeatable process so each week's submission has the same shape, cites only real evidence, and lands in the same three places.

Read [`config.md`](config.md) for the course folder, Notion home, Drive folder, Maven course URL, author, and the prior submission that anchors format. Read [`references/publishing.md`](references/publishing.md) for Notion and Drive mechanics, the two page shapes, and edge cases.

## Inputs

Gather these before step 1. Stop and ask the author for anything missing:
- The brief: a Maven URL (read it in the browser; the author is logged in) or pasted text.
- Evidence: the file paths and URLs the submission may cite. Only what exists.
- The format anchor: the prior week's local submission doc, named in `config.md`.
- The config values from `config.md`.

## Process

### 1. Load config and brief

Read `config.md`. Read the brief, whether the URL or the pasted text the author gave you. List every required and optional item the brief names as a checklist, with a blank evidence column beside each row.

Done when: the checklist exists and covers every item the brief names.

### 2. Classify the brief's form

A question-driven brief poses numbered questions: headings become the questions, verbatim. An evidence-driven brief poses a rubric or a deliverable list: headings become the required items in the brief's order, then the optional items. A brief with both: question-driven wins for the headings, and the rubric items become a checklist inside the Demo or Evidence heading. See the named shapes in `references/publishing.md`.

Done when: the outline exists and every checklist row from step 1 maps to a heading.

### 3. Gather evidence

For each checklist row, name the file or URL that proves it. Link it; do not paste large artifacts inline. A row with no evidence stays marked MISSING. Never invent evidence for a row.

Done when: every row is either linked or marked MISSING.

### 4. Draft the local submission doc

Write it at `<course folder>/Assignment_NN_*/Assignment_NN_Submission.md` in Hemingway prose: active voice, concrete words, short sentences. Take the title pattern and the Author/Project header from the format anchor named in `config.md`. Write prose under every heading from step 2, in order.

Done when: every heading has prose, every MISSING row from step 3 is called out plainly in the doc, and a "Considered and rejected" paragraph exists if the brief asked for choices.

### 5. Gate: the author reviews the local doc

Stop here. Show the author the doc and wait for a go. Nothing in steps 6 through 8 runs until it comes.

Done when: the author has approved the doc, in words, in this conversation.

### 6. Publish the Notion cover page

Add it as a child of the project home named in `config.md`: a thin cover: a status callout carrying the date and state, then the doc's sections, with links into existing chapters rather than copies of them. Add the week's row to the home's weekly table. Use the anchored-append pattern in `references/publishing.md`. Re-fetch the page after writing.

Done when: the re-fetched page shows every heading as a heading, every table as a table, and the weekly table carries the new row.

### 7. Write the Maven blurb

Match the FDE style: one plain paragraph on what it is, then labeled links one per line with the Notion page first (label it "Notion page", since "Submission page" means the Maven page to a classmate), then a "worth a look" paragraph with three or four hooks a reader would click for, then a sign-off. Keep it under 200 words. Append it to the local doc under a `## Maven post` heading. If the author has the Maven page open and asks, paste the blurb into the editor and stop before the buttons; see the Maven note in `references/publishing.md`. The author clicks Post or Submit.

Done when: the blurb is under 200 words, follows the four-part pattern, and is saved in the local doc.

### 8. Archive to Drive

Copy the local markdown into the assignment's subfolder under the Drive course folder named in `config.md`, and create a Google Doc from it with the Maven post section stripped. Upload images by hand; see `references/publishing.md`.

Done when: both files sit in the Drive subfolder.

### 9. Report

Give the author the checklist with each row marked Covered or MISSING, the Notion page URL, and the blurb text.

Done when: all three sit in the same message.

## Examples

Past runs, for a sense of scale and shape:

- A1, question-driven: the brief's four questions became four headings, plus a Demo heading and a Part B PRD cover. The Maven post was a Notion link only; the blurb style shown in step 7 came later.
- FDE A1, evidence-driven: the rubric became a status callout, a five-minute-read section, measured tables, a lessons section, a gave-up table, and a submission table. The Maven post for this run is the blurb pattern step 7 follows.
- A2, this skill's first run: the brief lists three required items and one optional item, so it takes the evidence-driven form.

## Constraints

- This skill never clicks Post or Submit on Maven. It may fill the editor on request; the author makes the click.
- Earlier weeks' shipped Notion pages stay untouched. Each new week gets its own new cover page.
- Every number and link in the submission traces to a file or page that exists.
- Public copies get scrubbed before they leave the machine. See the scrub list in `references/publishing.md`.
- Named people and personal data appear in public copies only where `config.md` clears them.
