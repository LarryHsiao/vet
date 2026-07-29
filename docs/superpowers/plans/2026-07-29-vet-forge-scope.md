# Vet Forge-Scope Behavior Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/vet` three new behaviors requested via the `vet` handoff channel by the `vitallink-frontend` session — diff-scope the linter row, lead a dirty report with a Hold verdict, and offer to open a PR/MR on a fully clear one — then bring `SKILL.md`'s preamble and Rules section into honest alignment with the resulting scope.

**Architecture:** All four tasks edit `skills/vet/SKILL.md` in place (a single markdown instruction file interpreted at `/vet` runtime, not compiled code); Task 2 also touches its companion rendering reference, `skills/vet/reference/report-format.md`. There is no compiler or test runner for this file — "correctness" means internal consistency (no step contradicts another) and a passing `claude plugin validate .` (frontmatter/schema check). Each task's steps therefore follow a read → edit → verify shape rather than red/green TDD.

**Tech Stack:** Markdown (Claude Code skill spec), YAML frontmatter, `claude` CLI (`plugin validate`), `git`/`gh`/`glab` CLIs referenced by the spec text itself.

## Global Constraints

- Vet never runs `git push` under any circumstance, including the new Step 10 — verified explicitly in Task 3.
- Vet never installs dependencies — no task adds an install path.
- Every new Bash permission added to frontmatter `allowed-tools` must be as narrow as the existing entries (a command prefix, not a bare `Bash(*)`).
- Existing behavior not named by one of the three requested changes must not move — this is a scope-preserving edit, not a rewrite (Surgical Changes).
- After every task, run `claude plugin validate .` from the repo root and confirm `✔ Validation passed`.

---

### Task 1: Diff-scope the linter row

**Files:**
- Modify: `skills/vet/SKILL.md` (frontmatter `allowed-tools`, and Step 5's JS/Dart/Go blocks)

**Interfaces:**
- Consumes: Step 2's already-collected file list for a `changes` target (existing, unnamed as a variable in the file — referred to in prose as "the files you changed"/"the collected files").
- Produces: no new named variable; Step 5's linter-row commands become conditional on `TARGET_KIND`, which Step 2 already fixes.

- [ ] **Step 1: Add the `npx eslint` permission**

In `skills/vet/SKILL.md`, in the frontmatter `allowed-tools` list, add a new line directly after `- Bash(npx tsc --noEmit*)`:

```yaml
  - Bash(npx eslint*)
```

- [ ] **Step 2: Add the shared scoping rule to Step 5's intro**

Find this paragraph (Step 5, right after the heading):

```
Only if already configured — never install anything to make one work. Compile,
tests, and lint are different things, not one undifferentiated block: each of
the three rows below resolves independently from its own source, per
`PROJECT_ECOSYSTEM` (fixed in Step 2), and renders **only** when that source
resolves.
```

Replace it with:

```
Only if already configured — never install anything to make one work. Compile,
tests, and lint are different things, not one undifferentiated block: each of
the three rows below resolves independently from its own source, per
`PROJECT_ECOSYSTEM` (fixed in Step 2), and renders **only** when that source
resolves.

When `TARGET_KIND` is `changes`, the linter row alone is scoped to the files
Step 2 already collected for that target — passed as explicit path arguments
to the underlying linter, never the configured whole-project script. The
compile and test rows stay whole-project always, regardless of `TARGET_KIND`:
a build or typecheck needs the full dependency graph, and scoping either risks
silently missing a regression in a file the diff didn't touch but broke.
```

- [ ] **Step 3: Rewrite the JS block**

Find:

```
**`PROJECT_ECOSYSTEM` is `js`** — unchanged:

- **`The code compiles`** resolves from a `typecheck` or `build` script in
  `package.json`; failing that, from `npx tsc --noEmit` when a `tsconfig.json`
  exists.
- **`The project's tests pass`** resolves from a `test` script in
  `package.json`.
- **`The project's linter passes`** resolves from a `lint` script in
  `package.json`.
```

Replace with:

```
**`PROJECT_ECOSYSTEM` is `js`**:

- **`The code compiles`** resolves from a `typecheck` or `build` script in
  `package.json`; failing that, from `npx tsc --noEmit` when a `tsconfig.json`
  exists. Always whole-project.
- **`The project's tests pass`** resolves from a `test` script in
  `package.json`. Always whole-project.
- **`The project's linter passes`** resolves from a `lint` script in
  `package.json` — that script's presence still gates whether this row
  renders at all. **When `TARGET_KIND` is `project`**, run that script
  unchanged. **When `TARGET_KIND` is `changes`**, don't run the configured
  script — invoke the linter directly against the collected files instead:
  `npx eslint <files>`.
```

- [ ] **Step 4: Rewrite the Dart block**

Find:

```
**`PROJECT_ECOSYSTEM` is `dart`** — run `<DART_CLI> analyze` once (`DART_CLI`
fixed in Step 2) and split its output by severity. Never run `analyze` twice:

- **`The code compiles`** resolves from that one run's **error**-severity
  results.
- **`The project's tests pass`** resolves from `<DART_CLI> test`.
- **`The project's linter passes`** resolves from that same run's
  **warning/info**-severity results — not a second command.
```

Replace with:

```
**`PROJECT_ECOSYSTEM` is `dart`** (`DART_CLI` fixed in Step 2):

- **`The code compiles`** resolves from `<DART_CLI> analyze`, always
  whole-project, taking that run's **error**-severity results.
- **`The project's tests pass`** resolves from `<DART_CLI> test`, always
  whole-project.
- **`The project's linter passes`** resolves from `analyze`'s
  **warning/info**-severity results. **When `TARGET_KIND` is `project`**,
  reuse the same whole-project run the compile row already made — never run
  `analyze` twice in that case. **When `TARGET_KIND` is `changes`**, that
  shared run only carries whole-project results, so run `analyze` a second
  time, scoped to the collected files (`<DART_CLI> analyze <files>`), and
  take this row's results from that second run instead.
```

- [ ] **Step 5: Rewrite the Go block**

Find:

```
**`PROJECT_ECOSYSTEM` is `go`**:

- **`The code compiles`** resolves from `go build ./...`.
- **`The project's tests pass`** resolves from `go test ./...`.
- **`The project's linter passes`** resolves from `golangci-lint run`, only
  when `command -v golangci-lint` resolves or a `.golangci.yml`/
  `.golangci.yaml` exists at the project root; the row is absent otherwise —
  the same "don't render what doesn't resolve" rule as a JS project with no
  `lint` script.
```

Replace with:

```
**`PROJECT_ECOSYSTEM` is `go`**:

- **`The code compiles`** resolves from `go build ./...`, always whole-project.
- **`The project's tests pass`** resolves from `go test ./...`, always
  whole-project.
- **`The project's linter passes`** resolves from `golangci-lint run`, only
  when `command -v golangci-lint` resolves or a `.golangci.yml`/
  `.golangci.yaml` exists at the project root; the row is absent otherwise —
  the same "don't render what doesn't resolve" rule as a JS project with no
  `lint` script. **When `TARGET_KIND` is `project`**, run it unchanged. **When
  `TARGET_KIND` is `changes`**, scope it to the collected files instead:
  `golangci-lint run <files>`.
```

- [ ] **Step 6: Verify**

Run:

```bash
claude plugin validate .
```

Expected: `✔ Validation passed`.

Then re-read the full Step 5 section top to bottom and confirm: every mention
of the linter row for all three ecosystems names both the `project` and
`changes` behavior; the compile and test rows read "always whole-project" with
no scoping language attached to them anywhere.

- [ ] **Step 7: Commit**

```bash
git add skills/vet/SKILL.md
git commit -m "vet: diff-scope the linter row to changed files"
```

---

### Task 2: Hold-verdict gate

**Files:**
- Modify: `skills/vet/SKILL.md` (Step 8)
- Modify: `skills/vet/reference/report-format.md` (worked examples)

**Interfaces:**
- Consumes: the fail-count `N` that Step 8 item 3 already computes for the footer (`**N things to fix. M of T checks completed.**`).
- Produces: no new named variable — the hold line reuses `N` and renders before `TARGET_SENTENCE`.

- [ ] **Step 1: Add the verdict-first rule to Step 8**

In `skills/vet/SKILL.md`, find:

```
## Step 8 — Write the report

Shape (full worked example in `reference/report-format.md`):

1. `TARGET_SENTENCE` as the opening line.
2. The table: `| # | What I checked | Result |`, in check-number order,
```

Replace with:

```
## Step 8 — Write the report

Shape (full worked example in `reference/report-format.md`):

**Verdict-first line.** Before anything else — before `TARGET_SENTENCE` —
check whether the table about to be rendered holds at least one **Fix this**
row: a dispatched check that resolved `fail`, or a mechanical Step 5 row that
resolved `Fix this`. A mechanical `Couldn't run` never counts — missing
tooling is not a defect. If at least one does, render this as its own
paragraph, before anything else: `> **Hold — N thing(s) need fixing before
this is ready to hand off.**`, where `N` is the same count item 3 below
computes for the footer, rendered singular when `N` is 1 ("1 thing needs
fixing") exactly the way item 3's own footer already does ("1 thing to fix"
vs "N things to fix"). This applies in both the default and `--gated`
shapes — it's part of the whole-picture render that happens up front either
way. Render nothing here when the table is fully clear; item 3's footer, and
Step 10's offer, carry that case instead.

1. `TARGET_SENTENCE` as the opening line — the line right after the hold
   verdict when one rendered, otherwise the true first line.
2. The table: `| # | What I checked | Result |`, in check-number order,
```

- [ ] **Step 2: Add the hold blockquote to the "Default (batch) report" example**

In `skills/vet/reference/report-format.md`, find:

```
## Default (batch) report

```
I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result       |
```

Replace with:

```
## Default (batch) report

Any **Fix this** row — mechanical or dispatched — earns a hold verdict as the
very first line, before `TARGET_SENTENCE`:

```
> **Hold — 2 things need fixing before this is ready to hand off.**

I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result       |
```

- [ ] **Step 3: Add the hold blockquote to the "Mechanical rows plus dispatched checks" example**

Find:

```
```
I checked the 4 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result        |
```

Replace with:

```
```
> **Hold — 1 thing needs fixing before this is ready to hand off.**

I checked the 4 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result        |
```

- [ ] **Step 4: Add the hold blockquote to the gated-mode example**

Find (under `## Gated mode (`/vet --gated`)`):

```
```
I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result       |
|---|-----------------------------------------------|--------------|
| 1 | Everything it needs is actually here          | Fix this     |
```

Replace with:

```
```
> **Hold — 2 things need fixing before this is ready to hand off.**

I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result       |
|---|-----------------------------------------------|--------------|
| 1 | Everything it needs is actually here          | Fix this     |
```

- [ ] **Step 5: Point the all-clear example at Step 10**

Find, at the end of the `## All-clear` fenced block:

```
I checked how this was built, not whether it does what you asked for. To check
that too, run `/vet "describe what you asked for"`.
```
```

(the closing fence right after that line, within the All-clear section specifically — there are two such identical sentences in the file; edit only the one inside `## All-clear`, which is the block containing `**0 things to fix. 3 of 3 checks completed.**` directly above it.)

Add this line immediately after that section's closing fence, before the next `## Edge cases` heading:

```
Zero **Fix this** rows means no hold line — and it's also what triggers
Step 10's offer to open a PR/MR (SKILL.md), asked only after this report and
`HANDOFF.md` are both written.
```

- [ ] **Step 6: Verify**

Run:

```bash
claude plugin validate .
```

Expected: `✔ Validation passed`.

Then re-read `reference/report-format.md` top to bottom and confirm every
example containing a `Fix this` row now opens with a matching `> **Hold —
…**` line, and the all-clear example does not.

- [ ] **Step 7: Commit**

```bash
git add skills/vet/SKILL.md skills/vet/reference/report-format.md
git commit -m "vet: lead a dirty report with a Hold verdict"
```

---

### Task 3: All-clear PR/MR offer

**Files:**
- Modify: `skills/vet/SKILL.md` (frontmatter `allowed-tools`, Step 9's closing line, new Step 10)

**Interfaces:**
- Consumes: Step 8's "zero `Fix this` rows" condition (same one Task 2 names); Step 9's HANDOFF.md write (Step 10 runs after it).
- Produces: nothing consumed by a later step — Step 10 is the last step in the file before `## Vocabulary`.

- [ ] **Step 1: Add the gh/glab permissions**

In `skills/vet/SKILL.md` frontmatter `allowed-tools`, add these four lines directly after `- Bash(command -v golangci-lint*)` (the last existing entry):

```yaml
  - Bash(gh pr create*)
  - Bash(gh pr list*)
  - Bash(glab mr create*)
  - Bash(glab mr list*)
  - Bash(glab api*)
```

- [ ] **Step 2: Fix Step 9's "only question" claim**

Find, at the end of Step 9:

```
This is the only question Vet asks. Everything else stays auto-detected.
```

Replace with:

```
This is the only question Step 9 asks. Step 10 may ask one more — but only
when the report came back fully clear, and only about opening a PR/MR.
Everything else stays auto-detected.
```

- [ ] **Step 3: Add Step 10**

Find the `## Vocabulary` heading (the section immediately after Step 9 ends).
Insert this new section immediately before it:

```
## Step 10 — Offer to open the PR/MR (only when clear)

Only when Step 8's table held zero **Fix this** rows — the same condition
that suppressed the hold verdict there. Skip this step entirely otherwise:
no question, no mention of it, nothing rendered.

1. **Find the forge.** Read the `origin` remote: `git remote get-url origin`.
   A URL containing `github.com` → `github`. A URL containing `gitlab.com`, or
   any other GitLab host reachable the same way (match on `gitlab` in the
   hostname) → `gitlab`. Neither matches, or there is no `origin` remote at
   all → skip this step silently; there is nothing to open a PR/MR against.
2. **Confirm the branch is pushed.** `git rev-parse --abbrev-ref @{u}` — if it
   fails, the branch has no upstream. Vet never pushes on its own, so say so
   plainly and stop, without asking anything: "This looks ready to hand off,
   but the branch isn't pushed yet. Push it yourself, then run `/vet` again
   and I'll offer to open the PR."
3. **Check for an existing PR/MR.** `gh pr list --head <branch> --state all
   --json url` (github) or `glab mr list --source-branch <branch>` (gitlab).
   If one is already open, merged, or closed for this branch, say so and give
   its URL. Stop here; never open a duplicate.
4. **Ask.** `AskUserQuestion`, once: open a PR/MR now, or not. On **no**, stop
   — say nothing further. On **yes**:
   - `github`: `gh pr create --assignee @me --title "<title>" --body
     "<body>"`
   - `gitlab`: `glab mr create --assignee "$(glab api user --jq .username)"
     --title "<title>" --body "<body>"`
   - `<title>` is the latest commit's subject: `git log -1 --format=%s`.
   - `<body>` is exactly: `Opened by /vet after a clean check. See HANDOFF.md
     for handoff notes.`
   - The person running Vet is the author, so they're the assignee — the same
     convention every self-assigned PR/MR in this project's workflow follows.
   Relay the forge's own confirmation (the PR/MR URL) once it returns.

This is the only forge-mutating action Vet ever takes, and it happens only
behind this explicit, one-time confirm — never as a side effect of anything
else in this file. It still never runs `git push`; step 2 above refuses
outright rather than pushing on the person's behalf.
```

- [ ] **Step 4: Verify**

Run:

```bash
claude plugin validate .
```

Expected: `✔ Validation passed`.

Then grep the file for the old claim to confirm it's gone:

```bash
grep -n "the only question Vet asks" skills/vet/SKILL.md
```

Expected: no match (the line now reads "the only question Step 9 asks").

- [ ] **Step 5: Commit**

```bash
git add skills/vet/SKILL.md
git commit -m "vet: offer to open a PR/MR when the report is fully clear"
```

---

### Task 4: Rewrite preamble and Rules to reflect the new scope

**Files:**
- Modify: `skills/vet/SKILL.md` (frontmatter `description`, intro paragraph, `## Rules`)

**Interfaces:**
- Consumes: Step 8's Hold verdict (Task 2) and Step 10's PR/MR offer (Task 3) by name — this task must run after both, since it describes them.
- Produces: nothing — this is the terminal task.

- [ ] **Step 1: Rewrite the frontmatter `description`**

Find (the `description:` line in frontmatter — it is one long line):

```
description: Use when someone wants to check work an AI coding assistant built before handing it to an engineer — invoked as /vet, or in plain words such as "check my work", "is this ready to hand over", "did my assistant do this properly". Dispatches one agent per check file in parallel over the changed files, and returns a plain-language report that explains each problem and gives text to paste back to the assistant. Vet writes one file, which is its own — HANDOFF.md, plus .vet/ scratch — and never edits the person's source, never commits, never pushes, never installs.
```

Replace with:

```
description: Use when someone wants to check work an AI coding assistant built before handing it to an engineer — invoked as /vet, or in plain words such as "check my work", "is this ready to hand over", "did my assistant do this properly". Dispatches one agent per check file in parallel over the changed files, and returns a plain-language report that explains each problem and gives text to paste back to the assistant, leading with a Hold verdict when anything needs fixing. Vet writes one file, which is its own — HANDOFF.md, plus .vet/ scratch — and never edits the person's source, never commits, never pushes, never installs. When every check comes back clear, it may also ask whether to open a PR/MR for an already-pushed branch — the one other action it ever takes, gated behind an explicit yes.
```

- [ ] **Step 2: Rewrite the intro paragraph**

Find (right after the `# Vet` heading):

```
Vet checks work an AI coding assistant built, before it reaches an engineer. Vet
writes one file, which is its own — `HANDOFF.md`, plus `.vet/` scratch. It never
edits the person's source, never commits, never pushes, never installs. The
person reading its report is the one who built the feature, not an
engineer — write and render everything with that reader in mind.
```

Replace with:

```
Vet checks work an AI coding assistant built, before it reaches an engineer. Vet
writes one file, which is its own — `HANDOFF.md`, plus `.vet/` scratch. It never
edits the person's source, never commits, never pushes, never installs. When
the report comes back fully clear, it may also ask whether to open a PR/MR for
a branch that's already pushed (Step 10) — the one other action it ever takes,
and only behind an explicit yes. The person reading its report is the one who
built the feature, not an engineer — write and render everything with that
reader in mind.
```

- [ ] **Step 3: Rewrite the `## Rules` section**

Find:

```
## Rules

- Dispatch is always parallel, in one message. Never sequential, never one
  check per turn (checks, not turns — `--gated` only paces the *reveal* of
  findings already computed).
- Vet writes one file, which is its own — `HANDOFF.md`, plus `.vet/` scratch.
  It never edits the person's source, never commits, never pushes, never
  installs.
- Never render a report with zero checks (Step 4).
- Never mark a mechanical gate (Step 5) as a failure because tooling is absent.
- Never rewrite a check's `[WHAT]` or `[FIX]` text (Step 7).
```

Replace with:

```
## Rules

- Dispatch is always parallel, in one message. Never sequential, never one
  check per turn (checks, not turns — `--gated` only paces the *reveal* of
  findings already computed).
- Vet writes one file, which is its own — `HANDOFF.md`, plus `.vet/` scratch.
  It never edits the person's source, never commits, never pushes, never
  installs.
- Any **Fix this** row — mechanical or dispatched — earns a Hold verdict as
  the first line of the report (Step 8). It's a signal, not an enforced gate:
  Vet cannot block a merge, it can only say plainly not to make one yet.
- The one action Vet takes beyond writing files and asking questions: when the
  report comes back fully clear, it may open a PR/MR (Step 10) — never
  silently, only behind an explicit yes, only against a branch already pushed
  by the person, and only after checking one doesn't already exist.
- Never render a report with zero checks (Step 4).
- Never mark a mechanical gate (Step 5) as a failure because tooling is absent.
- Never rewrite a check's `[WHAT]` or `[FIX]` text (Step 7).
```

- [ ] **Step 4: Verify**

Run:

```bash
claude plugin validate .
```

Expected: `✔ Validation passed`.

Then grep for the remaining "never pushes" claim to confirm it's still present and now sits beside an honest description of Step 10 rather than contradicting it:

```bash
grep -n "never pushes" skills/vet/SKILL.md
```

Expected: two matches (frontmatter `description` and the intro paragraph), both now paired with the Step 10 caveat in the same sentence or the sentence immediately following.

- [ ] **Step 5: Commit**

```bash
git add skills/vet/SKILL.md
git commit -m "vet: rewrite preamble and Rules to reflect the new scope"
```

---

## Known trade-off, carried forward from the handoff request

Tasks 2 and 3 are a real scope change for Vet: it moves from a pure,
git/forge-inert auditor to a tool that can — once, behind an explicit
confirm, only on a fully clear report — open a PR/MR. This was raised with
the user by the `vitallink-frontend` session before they asked for it anyway;
Task 4 exists specifically so `SKILL.md` states that honestly rather than
still reading "never" in the places that are no longer true in spirit (even
though every individual "never commits / never pushes / never installs" verb
does remain literally accurate after all four tasks land).

## Out of scope (flagged, not silently folded in)

`README.md` repeats the same "never edits your source, never commits, never
pushes, never installs anything" claim this plan updates in `SKILL.md`. The
user's instruction for this plan named `SKILL.md` specifically; leaving
`README.md` untouched is a deliberate non-goal here, not an oversight — worth
a follow-up pass.
