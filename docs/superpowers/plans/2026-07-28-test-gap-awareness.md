# Vet Test-Gap-Awareness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `What has no test` section to `HANDOFF.md` that names, for each
dispatched check's `Fix this` finding, whether any test file references the
flagged filename. Presence only, never a judgment of test quality.

## Why this exists

Discussed and agreed in chat on 2026-07-28, carried here since there is no
separate spec doc for this one:

Vet was asked whether it should have the receiving assistant write unit tests
automatically. The answer was no — a test written by the same AI that just
wrote the code tends to encode whatever the code currently does, bugs
included, rather than what it was supposed to do. That is the same tautology
`docs/writing-a-check.md` already names for why a fidelity check was rejected:
judging an artifact from the same artifact is circular.

Folding "and add a test" into the `[FIX]` text (the version of this idea aimed
at the *chat report*, addressed to the person who built the feature) was
rejected too, for a sharper reason: `[FIX]` is pasted into a fresh chat with no
memory, so a test-writing addendum needs to carry its own context inside an
already-capped 12-line block — and the reader is a non-technical person who
can watch a button start working but cannot tell a bad test from a good one.
That is the same silent-wrong Vet exists to prevent, reproduced one layer down,
in the one audience least equipped to catch it.

The version that survived: name the *fact* of test coverage, not the verdict
on its quality, and put it where the reader who *can* judge quality will see
it — `HANDOFF.md`, read by the engineer's AI, not the chat report read by the
PM. No new question, no `[FIX]` change, no scope creep on the checks
themselves.

**Architecture:** This extends `SKILL.md` Step 9 (the `HANDOFF.md` write) and
`report-format.md`'s template with one new sub-step and one new section. No new
check file, no new question added to Step 9's existing single-question rule,
no change to the chat report or `[FIX]` text. The new sub-step runs after Step
7 (replies are already parsed, so which rows are `Fix this` is already known)
and before Step 9 writes the file.

**Tech Stack:** Markdown skill files, `git`, `grep`, the `claude` CLI for
verification.

## Global Constraints

- **Only `Fix this` rows from the three dispatched checks are covered.**
  Mechanical rows (`The code compiles`, `The project's tests pass`, `The
  project's linter passes`) are excluded — a compile or lint failure isn't "a
  file that may lack a test" in the same sense a flagged component is.
- **Presence, not quality.** Grep test-shaped files (`*.test.*`, `*.spec.*`,
  files under `__tests__/`) for a reference to the flagged file's module path
  or basename (with and without extension). Never open the matched test file
  to judge whether it actually exercises the specific defect Vet flagged —
  that judgment belongs to the engineer's AI, per the rationale above.
- **No new question.** Step 9 still asks exactly one thing (what the person
  tried). This section is auto-detected like everything else in `HANDOFF.md`.
- **No change to the chat report or `[FIX]` text.** This is a `HANDOFF.md`-only
  addition.
- **A same-named test file that doesn't reference the flagged file must not
  count as coverage.** This is the specific failure mode the fixtures exist to
  catch — a naive "does a same-named test file exist" check would be fooled by
  a coincidence; the real check is "does a test file's own content reference
  this file," regardless of what the test file is named.
- **Known, accepted limitation — state it, don't solve it:** a test file that
  imports the flagged file for an unrelated reason (e.g. a shared constant)
  will read as "covered" under a plain reference grep. This is the same
  presence-not-quality tradeoff as the rest of this feature and is intentional,
  not a bug to chase.

## Testing Reality — read before starting

Same situation as the original handoff-integrity plan: **there is no
unit-test harness.** Vet is markdown; its behaviour only exists when a model
executes it. Verification is a **live run**:

```bash
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check <target>. Follow its SKILL.md exactly."
```

Prefer invoking the actual `/vet` (or `/vet:vet`) command over the hand-built
`claude -p` form when the session allows it — the branch's own prior review
found a Critical defect (`Write` missing from `commands/vet.md`'s
`allowed-tools`) that six rounds of `claude -p`-only verification never
caught, precisely because that form used a wider hand-rolled `--allowedTools`
than the real entry point carries. If `/vet` will not resolve in this
environment, report that honestly rather than silently substituting the `-p`
form.

**Every check needs all three controls this time, not two.** A file flagged
with no test at all, a file flagged with a real covering test, and a file
flagged whose test directory contains a same-named file that does not actually
reference it. The third control is the one that catches "fooled by naming
alone," the single most valuable thing these fixtures test.

---

### Task 1: Add the "What has no test" section

**Files:**
- Create: `test/fixtures/test-gap-awareness/no-test/Widget.tsx`
- Create: `test/fixtures/test-gap-awareness/with-test/Widget.tsx`
- Create: `test/fixtures/test-gap-awareness/with-test/Widget.test.tsx`
- Create: `test/fixtures/test-gap-awareness/name-only/Widget.tsx`
- Create: `test/fixtures/test-gap-awareness/name-only/Widget.test.tsx`
- Create: `test/fixtures/test-gap-awareness/README.md`
- Modify: `skills/vet/SKILL.md` — new sub-step in Step 9
- Modify: `skills/vet/reference/report-format.md` — `HANDOFF.md` template

**Interfaces:**
- Consumes: Step 7's already-parsed per-check verdicts (which rows are `Fix
  this`, and which check name each belongs to). No new dispatch, no new agent
  call.
- Produces: the `## What has no test` section of `HANDOFF.md`.

- [ ] **Step 1: Write the three fixtures — three controls, not two**

Each `Widget.tsx` is deliberately identical in shape — an unlabelled hardcoded
metric, which reliably trips `Nothing pretends to be finished` — so the only
variable across the three fixtures is test coverage, not the underlying
defect:

`test/fixtures/test-gap-awareness/no-test/Widget.tsx` — flagged, and truly has
no test anywhere in its directory:

```tsx
export function Widget() {
  return <p>{"+18% engagement this week"}</p>;
}
```

`test/fixtures/test-gap-awareness/with-test/Widget.tsx` — same shape, flagged
the same way, but genuinely covered:

```tsx
export function Widget() {
  return <p>{"+18% engagement this week"}</p>;
}
```

`test/fixtures/test-gap-awareness/with-test/Widget.test.tsx` — imports and
references it:

```tsx
import { Widget } from "./Widget";

test("renders without crashing", () => {
  Widget();
});
```

`test/fixtures/test-gap-awareness/name-only/Widget.tsx` — same shape again,
flagged the same way, but its sibling test file is a decoy:

```tsx
export function Widget() {
  return <p>{"+18% engagement this week"}</p>;
}
```

`test/fixtures/test-gap-awareness/name-only/Widget.test.tsx` — exists, is
named exactly like a real covering test, and must **not** count: it never
imports or references `Widget.tsx` at all.

```tsx
// Coincidentally named like a covering test. Tests something unrelated.
import { formatDate } from "../../helpers/format-date";

test("formats a date", () => {
  formatDate(new Date());
});
```

`test/fixtures/test-gap-awareness/README.md`:

```markdown
# Fixtures: what has no test

All three `Widget.tsx` files are identical and each reliably trips "Nothing
pretends to be finished" — the only variable across the three is test
coverage, not the underlying defect.

| Directory | Has a real covering test? | What `HANDOFF.md` must say |
|---|---|---|
| `no-test/` | No | "no test file references it" |
| `with-test/` | Yes — `Widget.test.tsx` imports it | "covered by `Widget.test.tsx`" |
| `name-only/` | **No** — `Widget.test.tsx` exists but never imports `Widget.tsx` | "no test file references it" |

**Invariant:** if a run reports `name-only/Widget.tsx` as covered, the check is
pattern-matching on the test file's *name* rather than its *content*, and is
wrong. This is the single most valuable thing these fixtures catch.
```

- [ ] **Step 2: Add the sub-step to `SKILL.md` Step 9**

Insert, after Step 7 has run and before the `HANDOFF.md` write in Step 9:

> **Naming test gaps.** For each dispatched check's row that resolved `fail`
> in Step 7, take the file(s) named in its `[WHAT]` text. For each such file,
> search test-shaped files (`*.test.*`, `*.spec.*`, anything under
> `__tests__/`) in the checked target for a reference to that file — an
> `import` or `require` naming its path or basename, with or without
> extension. A same-named test file that does not itself reference the
> flagged file does not count; only an actual reference does.
>
> Render one line per flagged file: if no reference was found, "`<file>`
> (flagged above for "`<check name>`"): no test file references it." If one
> was found, "`<file>` (flagged above for "`<check name>`"): covered by
> `<test file>` — worth checking whether it exercises this specific defect."
> If Step 7 produced no `Fix this` rows from the dispatched checks at all,
> the whole section reads: "Nothing flagged, so nothing to name here."
>
> This never opens the matched test file to judge whether it actually
> exercises the flagged defect — that judgment is the engineer's AI's to
> make, not Vet's. Presence only.

- [ ] **Step 3: Add the section to the `HANDOFF.md` template**

In `report-format.md`, insert a new section immediately after `## What is
known-broken` and before `## What the person actually tried`:

````markdown
## What has no test
<one line per Fix-this dispatched-check finding, per the rule above. If none:>
Nothing flagged, so nothing to name here.
````

Update the surrounding "every section is always present" note to mention the
new section by name.

- [ ] **Step 4: Reinstall and verify live**

Prefer the real entry point per this plan's Testing Reality section:

```bash
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
```

Then, from a session rooted at the project (so the plugin resolves), run
`/vet` (or `/vet:vet`) against a target containing all three fixture
directories — e.g. point it at `test/fixtures/test-gap-awareness/` directly,
or copy the three subfolders into a throwaway scratch project with its own
`package.json` if the guard requires one. Approve the `Write` when Step 9
reaches it.

**Expected — all three, or the task is not done:**
1. `HANDOFF.md`'s `## What has no test` section names `no-test/Widget.tsx` as
   having no test file reference it.
2. It names `with-test/Widget.tsx` as covered by `Widget.test.tsx`.
3. It names `name-only/Widget.tsx` as having no test file reference it — this
   is the discrimination test. A run that reports it as covered has failed
   even though a same-named test file genuinely exists on disk.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add the What has no test section to HANDOFF.md

Names, for each dispatched check's Fix-this finding, whether any test
file actually references the flagged file -- presence only, never a
judgment of test quality. That judgment stays with the engineer's AI,
the reader who can tell a good test from a bad one; the chat report and
its [FIX] text are unchanged, so the non-technical builder is never
asked to trust a test they can't evaluate.

Rejected alternatives, and why: having the builder's assistant write
tests automatically risks a test that encodes the code's current (buggy)
behavior rather than the intended one -- the same tautology
docs/writing-a-check.md already names for the fidelity check. Folding
'add a test' into [FIX] was rejected too: that text is pasted into a
fresh chat with no memory, capped at 12 lines, and read by someone who
can watch a button start working but can't judge a test's quality --
the same silent-wrong Vet exists to prevent, one layer down.

Three fixtures, not two: a flagged file with no test, one with a real
covering test, and one whose test directory holds a same-named file
that never actually references it -- the discrimination test proving
the check reads test content, not test filenames."
```

---

## Verification summary

| Task | Live run proves |
|---|---|
| 1 | `no-test/` names no coverage; `with-test/` names its real test; `name-only/` is **not** fooled by the coincidental filename |

## Gaps this plan does not close

Deliberately, per the rejected-alternatives discussion above:

1. **Test quality is never judged.** A `with-test/`-style "covered by" line
   says nothing about whether the test actually exercises the flagged defect.
   Left to the engineer's AI on purpose.
2. **Mechanical rows carry no test-gap awareness.** A compile or lint failure
   never gets a "what has no test" line — only dispatched-check `Fix this`
   rows do.
3. **A test that imports the flagged file for an unrelated reason (a shared
   constant, say) still reads as "covered."** Accepted, not solved — the same
   presence-not-quality tradeoff as the rest of this feature.
