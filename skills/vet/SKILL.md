---
name: vet
description: Use when someone wants to check work an AI coding assistant built before handing it to an engineer — invoked as /vet, or in plain words such as "check my work", "is this ready to hand over", "did my assistant do this properly". Dispatches one agent per check file in parallel over the changed files, and returns a plain-language report that explains each problem and gives text to paste back to the assistant. Audit only — it never edits, commits, or pushes.
argument-hint: '[all | recent | <folder>] ["what you asked for"] [--gated]'
allowed-tools:
  - Read
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - Bash(git *)
  - Bash(ls *)
  - Bash(wc *)
  - Bash(npm run lint*)
  - Bash(npm run typecheck*)
  - Bash(npx tsc --noEmit*)
---

# Vet

Vet checks work an AI coding assistant built, before it reaches an engineer. It
is audit only: it never edits a file, never commits, never pushes, never installs
anything. The person reading its report is the one who built the feature, not an
engineer — write and render everything with that reader in mind.

## Step 1 — Read the arguments

Parse `$ARGUMENTS` into up to three pieces, in any order:

- A **target verb**: `all` (whole project), `recent` (last commit), or a path
  that exists in the project (check a folder). Absent → auto-detect (Step 2).
- A **quoted intent string** — what the person originally asked their assistant
  to build. Record it as `INTENT`. Absent → no intent, and the footer says so
  (Step 8).
- The flag **`--gated`** — walk through findings one at a time instead of all at
  once (Step 8). Absent → render the full report in one pass.

Anything else in `$ARGUMENTS` that isn't recognized: if it matches an existing
path, treat it as the target; otherwise ignore it and note in one line that it
wasn't understood.

## Step 2 — Work out what to check

Run, in order, stopping at the first that applies:

1. `git rev-parse --show-toplevel` fails → **target: project** (whole tree).
   Sentence: "This project isn't tracked in Git, so I checked the whole thing."
2. `git status --porcelain` is non-empty → **target: changes** (uncommitted).
   Sentence: "I checked the N files you changed but haven't saved to the
   project's history yet."
3. Clean tree, current branch has commits ahead of the default branch (the first
   of `main`, `master`, `origin/HEAD` that resolves via
   `git merge-base HEAD <base>`) → **target: changes**, diffed against that
   merge-base. Sentence: "I checked everything on this line of work — N files
   since it split off from `<base>`."
4. Clean tree, on the default branch → **target: changes**, `git show HEAD`.
   Sentence: "Nothing is unsaved, so I checked the most recent batch of changes."
5. Anything else → **target: project**. Sentence: "I couldn't find recent
   changes, so I checked the whole project."

If the user gave `all`, `recent`, or a path explicitly, use that target and
build the matching sentence instead of running this cascade.

**Collecting files for a `changes` target**: the diff itself, plus untracked
files from `git ls-files --others --exclude-standard` rendered as synthetic
`+++`-only additions. Regardless of `.gitignore` contents, always hard-exclude
by path: `node_modules/`, `.next/`, `dist/`, `build/`, `out/`, `.venv/`,
`vendor/`, `coverage/`, `.git/`, any lockfile, and any file over 200 KB or
non-text.

**Whole-project mode's size gate**: count candidate source files after the
exclusions above. Over 400, call `AskUserQuestion` once, offering the two or
three largest source folders plus "check everything anyway" — never silently
sample.

Fix two variables for later steps: `TARGET_KIND` (`changes` or `project`) and
`TARGET_SENTENCE` (the plain-English line chosen above).

Never say *diff*, *HEAD*, *merge-base*, *working tree*, *staged*, or *SHA* in
anything the person will read. Say "the files you changed."

## Step 3 — Prepare what the checks will read

If the collected diff is under 500 lines, pass it inline in each check's prompt.
Otherwise write it once to `.vet/changes-<timestamp>.patch` under the project
root and pass that path instead. This is the only write Vet ever performs.

## Step 4 — Find the checks

Look first for `.vet/checks/*.md` in the project root (a project-local override
— if present, it entirely replaces the skill's own checks, no merging).
Otherwise use `${CLAUDE_PLUGIN_ROOT}/skills/vet/checks/*.md`.

**If neither location yields a single `*.md` file, stop here and say so
plainly.** Never render a report with zero checks — a report with no checks in
it looks identical to a project with no problems, and that is the single worst
failure this tool can produce.

For each check file found:

- Read its frontmatter: `name` (required), `scope` (single value or list,
  default `changes`), `applies_to` (optional glob list), `requires` (optional —
  currently only `intent` is meaningful).
- Drop it if its `scope` doesn't include `TARGET_KIND`.
- Drop it if it declares `requires: intent` and no `INTENT` was given in Step 1.
- If it declares `applies_to` and none of the collected files match any glob in
  the list, mark it `n/a` with the note "no files of this kind changed" and do
  **not** spend an agent on it.

Number the survivors from 1, in stable filename-sorted order. That index travels
out with the check's agent and back in its reply.

## Step 5 — Run the project's own checks (optional leading rows)

Only if already configured — never install anything to make one work.

- `package.json` has a `lint` or `typecheck` script → run it.
- No such script, but a `tsconfig.json` exists and `tsc` is reachable →
  `npx tsc --noEmit`.
- `node_modules` is missing, or the command isn't found → the row is
  **"Couldn't run — skipped,"** never a failure. Missing tooling is not a
  defect in the feature.

These render as leading rows, labelled "The project's own checks," above the
dispatched checks.

## Step 6 — Dispatch

One `Agent` call per surviving check, `subagent_type: general-purpose`, **all in
a single message** so they run in parallel — never sequentially. Timeout 60
seconds for a `changes` target, 120 seconds for `project`. A check that errors or
times out yields status `?`, presented as **Didn't finish**.

Assemble each check's prompt in this exact order:

1. `You are check #<N> of Vet: "<check name>".`
2. **The reply contract in full** — reproduced verbatim below. Put it before
   the check's own body so it is not drowned out.
3. The target: the inline diff, or the patch file path, or the project root.
4. `INTENT: <the quoted string>` — only if one was given in Step 1. Omit the
   line entirely otherwise.
5. The check file's body, verbatim.
6. `Remember — the verdict line first. A detail block only if the verdict is
   fail. Nothing else.`

Standing constraint stated in every prompt: the check may read any file in the
project; it must never write, edit, run a build, install a dependency, commit,
or push.

**Fixture-exclusion clarification, stated in every prompt:** a check's own
"Do not flag" section excludes test/fixture/mock directories so it doesn't
flag incidental test data in a real project. That exclusion is for *incidental*
material only. If a file's own purpose — stated in its filename, a comment, or
a sibling README — is specifically to demonstrate this class of check firing
(a deliberately-broken smoke-test fixture), evaluate it as real application
code; the exclusion must not swallow it. Without this, a fixture directory
looks structurally identical to the class of file every check is told to
ignore, and a smoke test silently stops proving anything.

### The reply contract

A one-line verdict, always:

```
<N>|<pass|fail|n/a>|<a short note, one line>
```

- `<N>` must match the number this check was assigned.
- Status is exactly one of `pass`, `fail`, `n/a` — nothing else.
- The note is a single line. No markdown, no line breaks.

**WRONG:**
```
Here is my finding:
1|pass|nothing flagged
```
**WRONG:**
```
## Verdict

The diff does not introduce any issues.

1|pass|ok
```
**RIGHT:**
```
1|pass|nothing flagged
```

**Only when the verdict is `fail`**, immediately follow the verdict line with a
detail block, delimited by sentinels that cannot be produced by accident:

```
3|fail|3 clickable elements cannot be reached with a keyboard
===VET-DETAIL-3===
[WHAT]
Three things that look and behave like buttons are built from plain `<div>`
elements with an onClick handler: `PricingCard.tsx` (the "Choose plan" tile),
`FilterBar.tsx` (the three sort chips), and `Modal.tsx` (the X in the corner).
Nothing about them tells the browser they are buttons. Someone using a keyboard
instead of a mouse — which includes every screen-reader user — cannot reach
these at all. For a paid-plan selector that is a blocked purchase.
[FIX]
In src/components/PricingCard.tsx, src/components/FilterBar.tsx and
src/components/Modal.tsx, replace every `<div onClick={...}>` that acts as a
button with a real `<button type="button">` carrying the same className and
onClick. Do not add `role="button"` and `tabIndex={0}` to keep the div — use the
real element. For the X in Modal.tsx, add `aria-label="Close"` since it has no
text. Do not silence any lint rule to make this pass.
===END-VET-DETAIL-3===
```

Contract rules for the detail block:

- `[WHAT]` explains what is wrong and why it matters, in one paragraph, in
  plain language — no jargon, no file:line notation. Name at most 3 concrete
  instances; beyond that, say "and N more of the same kind." Cap at 8 lines.
- `[FIX]` is the actionable instruction, addressed to *the person's assistant*,
  second person, imperative, self-contained (it will be pasted into a fresh
  chat with no memory of this report). It must name real files. It must state
  when a fix must NOT be a suppression (`eslint-disable`, `@ts-ignore`,
  `aria-hidden`, a deleted test) — whenever the check body's `Fail when` names a
  suppression as a failure mode, repeat that instruction here explicitly. Cap
  at 12 lines.
- **WRONG `[FIX]`:** "Fix the accessibility issues in these components." — well
  formed, useless, names nothing. **RIGHT:** the example above.
- Never emit a detail block for `pass` or `n/a`. Keep the common case at one
  line.

## Step 7 — Read the replies

For each reply, scan for the first line matching
`^\s*(\d+)\s*\|\s*(pass|fail|n/a)\s*\|(.*)$`. That alone produces a complete
table row: index must match this check's assigned number and status must be one
of the three values, or the row becomes `?` and the raw reply is dumped in a
fenced block beneath the table.

Only for rows whose status is `fail`, additionally scan the same reply for
`^===VET-DETAIL-<N>===\s*$` through `^===END-VET-DETAIL-<N>===\s*$`, and within
that span split on `^\[WHAT\]$` and `^\[FIX\]$`. Degrade one level at a time,
never abort the row:

- No detail block found → render the row with its short note only, plus "(no
  detail returned)".
- `[FIX]` missing but `[WHAT]` present → render `[WHAT]` and note the gap.
- Malformed beyond that → dump the raw tail in a fenced block under the row.

Never rewrite `[WHAT]` or `[FIX]`. You did not read the file the check agent
read; inflating a terse note into generic filler is the rules-document failure
this tool exists to avoid. You may only reflow whitespace and enforce the caps.

Status → presentation: `pass` → **Looks fine**. `fail` → **Fix this**. `n/a` →
**Doesn't apply**. unparseable/timeout → **Didn't finish**.

## Step 8 — Write the report

Shape (full worked example in `reference/report-format.md`):

1. `TARGET_SENTENCE` as the opening line.
2. The table: `| # | What I checked | Result |`, in check-number order,
   including any Step 5 mechanical rows first.
3. `**N things to fix. M of M checks ran.**` — M counts every check dispatched,
   including `n/a` and `?`.
4. One `###` section per **Fix this** row, in table order: **What's wrong**
   (the `[WHAT]` text) then a blockquote holding `[FIX]`, with no further
   label — the person will copy whatever is on screen regardless of what it is
   called.
5. If no `INTENT` was given in Step 1, the final line: "I checked how this was
   built, not whether it does what you asked for. To check that too, run
   `/vet \"describe what you asked for\"`."
6. Any `Didn't finish` row's raw reply, in a fenced block, at the very end.

**If `--gated` was passed** (Step 1): render items 1–3 exactly as above so the
whole picture is visible immediately, then render **only the first** Fix-this
section from item 4. End the turn there, with: "Reply `next` to see finding 2 of
N, or start fixing this one." Do not render further findings in this response.
When the person replies `next` (or similar), render the following Fix-this
section the same way, tracking position by what has already appeared in the
conversation — there is no separate state file. If there is no next finding,
say so and print item 5/6 as the close.

## Vocabulary

Never use *diff*, *HEAD*, *merge-base*, *working tree*, *staged*, *SHA*,
*file:line*, emoji, or severity jargon in anything rendered to the person. Say
what changed and where, in the terms in this file's examples. No hedging
("consider", "you might want to") inside a `[FIX]` — it is an instruction, not a
suggestion.

## Rules

- Dispatch is always parallel, in one message. Never sequential, never one
  check per turn (checks, not turns — `--gated` only paces the *reveal* of
  findings already computed).
- Never edit a file, run a build, install a dependency, commit, or push.
- Never render a report with zero checks (Step 4).
- Never mark a mechanical gate (Step 5) as a failure because tooling is absent.
- Never rewrite a check's `[WHAT]` or `[FIX]` text (Step 7).
