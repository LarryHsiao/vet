---
name: vet
description: Use when someone wants to check work an AI coding assistant built before handing it to an engineer — invoked as /vet, or in plain words such as "check my work", "is this ready to hand over", "did my assistant do this properly". Dispatches one agent per check file in parallel over the changed files, and returns a plain-language report that explains each problem and gives text to paste back to the assistant. Vet writes one file, which is its own — HANDOFF.md, plus .vet/ scratch — and never edits the person's source, never commits, never pushes, never installs.
argument-hint: '[all | recent | <folder>] ["what you asked for"] [--gated]'
allowed-tools:
  - Read
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - Write
  - Bash(git *)
  - Bash(ls *)
  - Bash(wc *)
  - Bash(npm run lint*)
  - Bash(npm run typecheck*)
  - Bash(npm run build*)
  - Bash(npm run test*)
  - Bash(npx tsc --noEmit*)
  - Bash(dart analyze*)
  - Bash(flutter analyze*)
  - Bash(dart test*)
  - Bash(flutter test*)
  - Bash(go build*)
  - Bash(go test*)
  - Bash(golangci-lint run*)
  - Bash(command -v golangci-lint*)
---

# Vet

Vet checks work an AI coding assistant built, before it reaches an engineer. Vet
writes one file, which is its own — `HANDOFF.md`, plus `.vet/` scratch. It never
edits the person's source, never commits, never pushes, never installs. The
person reading its report is the one who built the feature, not an
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

> **Project-type guard.** Check first for a `package.json`, `pubspec.yaml`, or
> `go.mod` anywhere in the project, excluding test/fixture directories (e.g.
> `test/fixtures/`) — those hold deliberately-planted material for the
> dispatched checks to find, not evidence that the project itself belongs to
> that ecosystem.
>
> **More than one manifest type found** (e.g. a `pubspec.yaml` under `mobile/`
> and a `go.mod` under `server/` in the same tree) → stop before checking
> anything. Call `AskUserQuestion` once, offering each manifest's containing
> folder as a candidate target — no "check everything anyway" option here,
> unlike the whole-project size gate below, because each ecosystem needs its
> own tool commands and there is no sensible combined check. Proceed with
> whichever folder is chosen, as an explicit path target — same as if the
> person had typed `/vet <folder>` themselves.
>
> **Exactly one manifest type found** fixes `PROJECT_ECOSYSTEM` for the rest of
> this run: `js` for `package.json`, `dart` for `pubspec.yaml`, `go` for
> `go.mod`. When it is `dart`, also read the `pubspec.yaml`: a `flutter:` entry
> under `dependencies:` (the `sdk: flutter` form) or a top-level `flutter:`
> section fixes `DART_CLI` to `flutter`; neither present fixes it to `dart`.
> This decision only affects which CLI Step 5 shells out to — it does not
> change which files the dispatched checks look at.
>
> **None found** → Vet cannot check this project. Say so plainly and stop:
> "Vet only understands JavaScript/TypeScript, Dart/Flutter, and Go projects at
> the moment, and this one doesn't look like any of those — so I haven't
> checked it. I'd rather tell you that than give you a clean bill of health I
> can't back up." Never render a report. A confident all-clear on a project Vet
> cannot read is the worst output it can produce.

Run, in order, stopping at the first that applies:

1. `git rev-parse --show-toplevel` fails → stop before checking anything.
   Call `AskUserQuestion` once: check the whole project, or point at a
   folder (offer the two or three largest source folders at the project's
   top level, by file count, as candidates, alongside "check everything"
   — never silently sample). Proceed with whichever is chosen, exactly as
   if the person had typed `/vet all` or `/vet <folder>` themselves, and
   build `TARGET_SENTENCE` to match that choice (e.g. "This project isn't
   tracked in Git, so I checked the whole thing." for whole project; the
   same folder-target phrasing an explicit `/vet <folder>` would use,
   otherwise).
2. Current branch has commits ahead of its base — check `git status --porcelain`
   before deciding what this means.

   **Resolving the base, in this order** (first that resolves via
   `git rev-parse --verify <ref>` wins): `origin/HEAD`, then `origin/main`,
   `origin/master`, `origin/develop`, `origin/trunk`, then the local `main`,
   `master`, `develop`, `trunk`. **Prefer the remote-tracking ref** — on a
   project whose default branch *is* `main`, a local `main` base resolves to
   the current branch itself, yields zero commits ahead, and drops through
   to rule 4, where the person is asked what to check rather than something
   being picked silently for them. People work directly on the default
   branch constantly, so this is a common path, not an edge case.
   `origin/main` keeps unpushed commits visible.

   **Counting commits ahead**: `git rev-list --count <base>..HEAD`. Greater
   than zero means this rule applies. If no base resolves at all (a repo with
   no remote and no conventionally-named branch), skip to rule 3.
   - **Non-empty (dirty)** → **stop. Do not dispatch any checks.** There is
     already-saved work on this branch and unsaved work sitting on top of it,
     and checking only one of the two would silently review a partial
     picture. Render exactly this and end the turn: "You have work here that's
     already saved, plus some newer changes that aren't saved yet. Save those
     newer changes first — commit them the way you normally would — then run
     `/vet` again and I'll check all of it together." Vet never commits,
     stashes, or undoes anything itself; it only asks.

     Say **save**, never *discard*, *clear out*, *reset*, or *stash*. Undoing
     work is not the outcome being asked for here, and naming it as an option
     invites a non-technical person to destroy work they cannot recover.
   - **Empty (clean)** → **target: changes**, diffed against the merge-base.
     This is the default path — the one auto-detection is meant to land on.
     Sentence: "I checked everything on this line of work — N files since it
     split off from `<base>`."
3. `git status --porcelain` is non-empty (and rule 2 didn't already apply —
   i.e. this branch has no commits ahead of the default branch) →
   **target: changes** (uncommitted). Sentence: "I checked the N files you
   changed but haven't saved to the project's history yet."
4. Clean tree, and the base resolved with zero commits ahead of it (the
   current branch IS the base, or simply hasn't diverged from it) → stop
   before checking anything. Call `AskUserQuestion` once, offering: the most
   recent commit, the whole project, or a folder. Proceed with whichever is
   chosen, exactly as if the person had typed `/vet recent`, `/vet all`, or
   `/vet <folder>` themselves, and build `TARGET_SENTENCE` to match (e.g.
   "Nothing is unsaved, so I checked the most recent batch of changes." if
   the last commit is chosen).
5. No base branch resolves at all, the tree is clean, and rule 3 didn't
   already apply → stop before checking anything. Call `AskUserQuestion`
   once, offering: name a branch to compare against (if one is given, resolve
   it with `git rev-parse --verify <name>` and diff against its merge-base,
   same as rule 2's clean case), the whole project, or a folder. Proceed
   with whichever is chosen, and build `TARGET_SENTENCE` to match (e.g. "I
   checked everything on this line of work — N files since it split off from
   `<base>`." if a branch is named; for whole project or folder, use the same
   phrasing rule 1 does for those outcomes).

If the user gave `all`, `recent`, or a path explicitly, use that target and
build the matching sentence instead of running this cascade — the
stop-and-ask cases above only apply to auto-detection, never to an explicit
target.

**Collecting files for a `changes` target**: the diff itself, plus untracked
files from `git ls-files --others --exclude-standard` rendered as synthetic
`+++`-only additions. Regardless of `.gitignore` contents, always hard-exclude
by path: `.vet/`, `node_modules/`, `.next/`, `dist/`, `build/`, `.dart_tool/`,
`out/`, `.venv/`, `vendor/`, `coverage/`, `.git/`, any lockfile, and any file
over 200 KB or non-text.

`.vet/` is excluded first and always, in every target mode. It is where Step 3
writes its own patch file, so without this a second run collects Vet's output
from the first and hands it to the checks as if it were the person's work —
Vet auditing its own scratch paper, silently, forever after.

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
Otherwise use `Write` to put it once in `.vet/changes-<timestamp>.patch` under
the project root, and pass that path instead.

This is the only write Vet ever performs, and it is scratch space, not a change
to the person's work: `.vet/` holds nothing but Vet's own intermediate files,
is excluded from collection by Step 2, and is listed in the project's
`.gitignore` by convention. It never touches a tracked file. If the write
fails for any reason, fall back to passing the diff inline and truncating at
500 lines with a note saying so — never abandon the run over scratch space.

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

Only if already configured — never install anything to make one work. Compile,
tests, and lint are different things, not one undifferentiated block: each of
the three rows below resolves independently from its own source, per
`PROJECT_ECOSYSTEM` (fixed in Step 2), and renders **only** when that source
resolves.

**`PROJECT_ECOSYSTEM` is `js`** — unchanged:

- **`The code compiles`** resolves from a `typecheck` or `build` script in
  `package.json`; failing that, from `npx tsc --noEmit` when a `tsconfig.json`
  exists.
- **`The project's tests pass`** resolves from a `test` script in
  `package.json`.
- **`The project's linter passes`** resolves from a `lint` script in
  `package.json`.

**`PROJECT_ECOSYSTEM` is `dart`** — run `<DART_CLI> analyze` once (`DART_CLI`
fixed in Step 2) and split its output by severity. Never run `analyze` twice:

- **`The code compiles`** resolves from that one run's **error**-severity
  results.
- **`The project's tests pass`** resolves from `<DART_CLI> test`.
- **`The project's linter passes`** resolves from that same run's
  **warning/info**-severity results — not a second command.

**`PROJECT_ECOSYSTEM` is `go`**:

- **`The code compiles`** resolves from `go build ./...`.
- **`The project's tests pass`** resolves from `go test ./...`.
- **`The project's linter passes`** resolves from `golangci-lint run`, only
  when `command -v golangci-lint` resolves or a `.golangci.yml`/
  `.golangci.yaml` exists at the project root; the row is absent otherwise —
  the same "don't render what doesn't resolve" rule as a JS project with no
  `lint` script.

A row whose source doesn't resolve at all is not rendered — not even as
"skipped." There is nothing to install and nothing to fix for that row, and a
"skipped" row would read as a chore the person is expected to go and complete.

When a row's source *does* resolve but the command still can't actually
run — dependencies aren't fetched, or the toolchain itself isn't found — the
row is **never a failure**; missing tooling is not a defect in the feature.
Render that row as **"Couldn't run"** and say why, naming the exact command to
fix it: `npm install` (`js`), `dart pub get` or `flutter pub get` matching
`DART_CLI` (`dart`), or `go mod download` (`go`). Adapt the sentence to name
the row in question (tests, lint, or the type/build check).

**This is an offer, never a gate.** Everything else proceeds exactly as
normal: all the dispatched checks still run, and the full report still
renders. Declining to install is a legitimate choice, not a problem to solve —
if the person runs `/vet` again without installing, state the same line once
more, plainly, and carry on. Never nag, never escalate the wording, never
withhold the report, and never ask them to confirm the choice.

These render as leading rows, above the dispatched checks, each labelled with
its own name — no longer grouped under one shared heading.

> `The code compiles` is the direct detection of the top failure mode. Lint is
> retained knowingly despite polish being out of scope: its output is
> mechanically true, cannot false-positive, and rules such as `exhaustive-deps`
> and `no-undef` (or their Dart/Go analogues) catch real defects rather than
> style. If it proves noisy in practice, this is the paragraph to revisit.

## Step 6 — Dispatch

One `Agent` call per surviving check, `subagent_type: general-purpose`, **all in
a single message** so they run in parallel — never sequentially. Timeout 60
seconds for a `changes` target, 120 seconds for `project`. A check that errors or
times out yields status `?`, presented as **Didn't finish**.

Assemble each check's prompt in this exact order:

Mint this run's `<RUNTOKEN>` first (see the reply contract below) — one token
for the whole run, shared by every check in it.

1. `You are check #<N> of Vet: "<check name>". This run's token is <RUNTOKEN>.`
2. **The reply contract in full** — reproduced verbatim below, with
   `<RUNTOKEN>` substituted throughout. Put it before the check's own body so
   it is not drowned out.
3. The target: the inline diff, or the patch file path, or the project root.
4. `INTENT: <the quoted string>` — only if one was given in Step 1. Omit the
   line entirely otherwise.
5. The check file's body, verbatim.
6. `Remember — the verdict line first, carrying the token VET-<RUNTOKEN>-<N>.
   A detail block only if the verdict is fail. Nothing else.`

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

**First, mint a run token.** Once per `/vet` invocation, before dispatching
anything, generate a short random token — 6+ characters, letters and digits,
e.g. `K7ta9Q`. Call it `<RUNTOKEN>`. The *same* token goes to every check in
this run, and a *different* one is minted on the next run. Never reuse a token
across runs, and never use a token that appears anywhere in this file.

Every verdict line is prefixed with it:

```
VET-<RUNTOKEN>-<N>|<pass|fail|n/a>|<a short note, one line>
```

So a run whose token is `K7ta9Q` expects check 1 to answer:

```
VET-K7ta9Q-1|pass|nothing flagged
```

- `<RUNTOKEN>` is the exact token handed to this check. Reproduce it verbatim.
- `<N>` must match the number this check was assigned.
- Status is exactly one of `pass`, `fail`, `n/a` — nothing else.
- The note is a single line. No markdown, no line breaks, no bold.

The token exists so that no line printed in this file — or quoted back by a
check that restates the format before answering — can ever be mistaken for a
real verdict. Only a line bearing this run's freshly-minted token counts.

**WRONG** (preamble before the verdict):
```
Here is my finding:
VET-K7ta9Q-1|pass|nothing flagged
```
**WRONG** (verdict buried under prose):
```
## Verdict

The change does not introduce any issues.

VET-K7ta9Q-1|pass|ok
```
**WRONG** (token dropped — unparseable, scores as Didn't finish):
```
1|pass|nothing flagged
```
**RIGHT:**
```
VET-K7ta9Q-1|pass|nothing flagged
```

**Only when the verdict is `fail`**, immediately follow the verdict line with a
detail block, delimited by sentinels that cannot be produced by accident:

```
VET-K7ta9Q-3|fail|3 clickable elements cannot be reached with a keyboard
===VET-DETAIL-K7ta9Q-3===
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
===END-VET-DETAIL-K7ta9Q-3===
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

For each reply, scan for lines matching, case-insensitively and tolerating
surrounding whitespace or markdown emphasis:

```
^[\s*_`]*VET-<RUNTOKEN>-(\d+)\s*\|\s*(pass|fail|n/a)\s*\|(.*)$
```

Three rules, and the order matters:

- **`<RUNTOKEN>` is this run's minted token, substituted literally.** A line
  without it is not a verdict, no matter how well-formed it looks. This is what
  makes the contract's own worked examples — and any echo of them — inert.
- **Take the *last* such match in the reply, not the first.** A check that
  restates the format before answering emits its template first and its real
  verdict last; taking the first would score the template.
- Index must match this check's assigned number and status must be one of the
  three values, or the row becomes `?` and the raw reply is dumped in a fenced
  block beneath the table.

Never relax the token requirement to "rescue" a reply that dropped it. An
unparseable reply becomes **Didn't finish** and says so — visibly wrong is
recoverable, silently wrong is not. This is the guard on the failure this whole
tool is built to avoid: a check that quietly reports `pass` without having
looked at anything.

Only for rows whose status is `fail`, additionally scan the same reply for
`^===VET-DETAIL-<RUNTOKEN>-<N>===\s*$` through
`^===END-VET-DETAIL-<RUNTOKEN>-<N>===\s*$`, and within that span split on
`^\[WHAT\]$` and `^\[FIX\]$`. Degrade one level at a time, never abort the row:

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

   **The Result cell holds the status words and nothing else** — exactly
   `Fix this`, `Looks fine`, `Doesn't apply`, `Didn't finish`, or (mechanical
   rows only) `Couldn't run`. No bold, no italics, no em-dash, no appended
   note, no count, no filename. The check's short note does not belong here;
   it is already carried by the `###` section below for failures, and is not
   shown at all otherwise. Likewise the `#` cell holds the bare number and the
   "What I checked" cell holds the check's `name` frontmatter verbatim.

   This is pinned because the table is the one part of the report that must be
   *comparable between runs*: the same code checked twice must produce
   byte-identical rows, so a person can see at a glance that nothing changed.
   Prose varies; the table must not.

   Section headings below the table follow the same rule — `### <N>. <name>`,
   a period after the number, never a dash or an em-dash.
3. `**N things to fix. M of T checks completed.**` — three distinct numbers,
   and both `M` and `T` count **every row on screen**, mechanical rows
   (Step 5) included — the footer describes the table the reader is looking
   at, not a subset of it. `N` = count of **Fix this** (fail) rows, of either
   kind. `T` = total rows in the table: every Step 5 mechanical row that
   rendered, plus every check that survived Step 4's filtering, whether
   dispatched or resolved by the `applies_to` shortcut. `M` = count of those
   rows that reached a definitive result. For a dispatched check that is
   `pass`, `fail`, or `n/a`, as opposed to **Didn't finish** (`?`, an error,
   timeout, or unparseable reply). A mechanical row is always definitive —
   `Looks fine`, `Fix this`, and `Couldn't run` are each a completed
   determination, not a stall — so every mechanical row that rendered counts
   toward `M` too; only a dispatched check's timeout or unparseable reply
   keeps `M` below `T`. In the ordinary case nothing times out, so `M` equals
   `T`.
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

## Step 9 — Write `HANDOFF.md`

The report tells the person what to fix. `HANDOFF.md` tells the **next
reader** — an engineer's AI, which never sees the chat — what it cannot
reconstruct from the code. Write it to the project root after the report.

**Naming test gaps.** For each dispatched check's row that resolved `fail` in
Step 7, take the file(s) named in its `[WHAT]` text. For each such file,
search test-shaped files (`*.test.*`, `*.spec.*`, `*_test.go`, `*_test.dart`,
anything under `__tests__/` or `test/`) in the checked target for a reference
to that file — an `import` or `require` naming its path or basename, with or
without extension.
A same-named test file that does not itself reference the flagged file does
not count; only an actual reference does.

Render one line per flagged file: if no reference was found, "`<file>`
(flagged above for "`<check name>`"): no test file references it." If one was
found, "`<file>` (flagged above for "`<check name>`"): covered by `<test
file>` — worth checking whether it exercises this specific defect." If Step 7
produced no `Fix this` rows from the dispatched checks at all, the whole
section reads: "Nothing flagged, so nothing to name here."

This never opens the matched test file to judge whether it actually exercises
the flagged defect — that judgment is the engineer's AI's to make, not Vet's.
Presence only.

**When `TARGET_KIND` is `changes`**, also consider every file in Step 2's
collected changes matching the dispatched checks' source extensions
(`**/*.tsx`, `**/*.jsx`, `**/*.ts`, `**/*.js`, `**/*.vue`, `**/*.svelte`,
`**/*.dart`, `**/*.go`), excluding test/story/fixture/mock files by the same
names used throughout the checks. Skip any file already named in the
flagged-file part above — it is not named twice.

For each remaining touched file, run the same reference search as above. If
no test file references it, add it to a second list within the same section.
Name at most three; beyond that, "and N more of the same kind." If every
touched file is either already named above, has a test, or there are none to
consider (including whenever `TARGET_KIND` is `project`), that second list is
simply absent — the section reads exactly as it would without this
paragraph in that case.

**Ask exactly one question first.** What the person actually exercised exists
nowhere in the code, and no static check can recover it: *"Before I write the
handoff notes — which parts of this did you actually try yourself? Anything
you clicked through and saw working, and anything you never opened."*

**This is an offer, never a gate — the same rule Step 5 applies to the install
offer.** Write `HANDOFF.md` in this same turn regardless of what comes back.
If an answer arrives, use it verbatim. If they decline, say nothing, or no
answer is possible at all (a non-interactive run, or the turn simply ends),
the "What the person actually tried" section reads exactly *"Not recorded."*
and the file is written anyway, with a line telling them they can run `/vet`
again and answer to fill it in. **Never** imply verification that did not
happen, and never withhold the file waiting for a reply — a question with no
file behind it has failed the one thing this step exists to do.

This is the only question Vet asks. Everything else stays auto-detected.

**Staleness.** Record the commit the file was generated against. On a later
run, if `HANDOFF.md` exists and names a different commit, say so plainly and
rewrite it. A handoff document describing code that has since changed misleads
the receiver with authority — the exact failure this tool exists to prevent.

**Vet writes this file and stops.** It does not commit it, does not stage it,
does not push. Tell the person it was written and that committing it is their
call. Vet writes one file, which is its own; it never edits their source.

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
- Vet writes one file, which is its own — `HANDOFF.md`, plus `.vet/` scratch.
  It never edits the person's source, never commits, never pushes, never
  installs.
- Never render a report with zero checks (Step 4).
- Never mark a mechanical gate (Step 5) as a failure because tooling is absent.
- Never rewrite a check's `[WHAT]` or `[FIX]` text (Step 7).
