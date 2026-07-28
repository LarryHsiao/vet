# Vet Touched-File Test-Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widen `HANDOFF.md`'s `What has no test` section (shipped in
`407fb8e`) so that, on a `changes`-scoped run, it also names touched files
that have no test at all — not only files a dispatched check already flagged
as `Fix this`.

## Why this exists

Discussed and agreed in chat on 2026-07-28. The shipped feature only surfaces
a test gap for a file a check already found defective — a file that is
touched by this change, perfectly clean by every dispatched check, and has
zero test coverage is invisible today. Asked directly ("有經手的檔案會提醒有沒有測試嗎"),
the honest answer was no, and this plan closes that specific gap.

**The friction worry from the earlier discussion still applies, more so now
— this plan exists to widen coverage without reopening it:**

- Still `HANDOFF.md`-only. The chat report and its `[FIX]` text are
  untouched, so the non-technical builder is never asked a new question or
  handed a new instruction to act on.
- Still no new question in Step 9.
- **Deliberately scoped to `changes` mode only.** Widening this to `project`
  mode would turn it into a general "which files in the whole codebase lack
  tests" audit — the exact scope creep the original design explicitly
  rejected (an untested-but-otherwise-clean project sails through by design;
  that gap is not this plan's to close). "Touched" only has a bounded, cheap
  meaning against a diff; against a whole project it is unbounded.
- **Capped the same way every check already is** — name three untested
  touched files, "and N more of the same kind" beyond that — so a large PR
  doesn't produce a wall of text in the one document meant to stay skimmable.

**Architecture:** Extends the same Step 9 sub-step from `407fb8e` (no new
check file, no new agent dispatch). Step 2 already collects the list of
changed files for a `changes` target; this sub-step reuses that same
collected list rather than recomputing it, and reuses the same
presence-via-reference grep already built for the flagged-file case.

**Tech Stack:** Markdown skill files, `git`, `grep`, the `claude` CLI for
verification.

## Global Constraints

- **Fires only when `TARGET_KIND == changes`.** In `project` mode, `What has
  no test` behaves exactly as it does today — flagged files only, no touched-
  file expansion.
- **"Touched"** = a file in Step 2's collected changes for this run (added or
  modified), restricted to the same source extensions the dispatched checks
  already use (`**/*.tsx`, `**/*.jsx`, `**/*.ts`, `**/*.js`, `**/*.vue`,
  `**/*.svelte`). Config files, docs, and lockfiles are not "testable" in this
  sense and are never considered.
- **Test/story/fixture/mock files themselves are never counted as touched
  targets needing a test** — the same exclusion vocabulary already used
  throughout the checks (`*.test.*`, `*.spec.*`, `__tests__/`, `fixtures/`,
  `mocks/`).
- **No duplication.** A file already named in the flagged-file part of the
  section (existing behavior) must not also appear in the new touched-file
  part — each file appears at most once in the whole section.
- **Presence, not quality — same rule as the shipped feature.** A reference
  (`import`/`require`) check against the flagged/touched file's path or
  basename; never opening the test to judge what it asserts.
- **Cap at three named untested touched files**, then "and N more of the same
  kind," matching the convention every dispatched check already states in its
  own `Do not flag` section.
- **No new question, no chat-report or `[FIX]` change** — same boundary the
  shipped feature already drew.

## Testing Reality — read before starting

Same situation as both prior plans: **there is no unit-test harness**;
verification is a **live run**. This time the fixture needs actual git
history, because "touched" is only meaningful relative to a real diff — a
single commit fixture cannot exercise it. Build a two-commit scratch repo:

```bash
mkdir -p ~/vet-scratch-touched && cd ~/vet-scratch-touched && git init -q
# commit 1 (base): package.json + untouched/Widget.tsx only
git add -A && git commit -q -m "base"
git checkout -q -b feature
# commit 2 (feature): add covered/, untested/, flagged-untested/ (see Task 1)
git add -A && git commit -q -m "feature work"
```

Then run `/vet` (bare, so it auto-detects `changes` against the resolved
base) from a session rooted there. Prefer the real `/vet` entry point over a
hand-built `claude -p` form, per the same lesson the branch's earlier review
already paid for once.

---

### Task 1: Widen the sub-step to cover touched, untested, unflagged files

**Files:**
- Modify: `skills/vet/SKILL.md` — extend the "Naming test gaps" sub-step in
  Step 9
- Modify: `skills/vet/reference/report-format.md` — extend the `HANDOFF.md`
  template's `What has no test` example
- Create: `test/fixtures/touched-file-coverage/covered/Widget.tsx`
- Create: `test/fixtures/touched-file-coverage/covered/Widget.test.tsx`
- Create: `test/fixtures/touched-file-coverage/untested/WidgetA.tsx`
- Create: `test/fixtures/touched-file-coverage/untested/WidgetB.tsx`
- Create: `test/fixtures/touched-file-coverage/untested/WidgetC.tsx`
- Create: `test/fixtures/touched-file-coverage/untested/WidgetD.tsx`
- Create: `test/fixtures/touched-file-coverage/flagged-untested/Widget.tsx`
- Create: `test/fixtures/touched-file-coverage/untouched/Widget.tsx`
- Create: `test/fixtures/touched-file-coverage/README.md`

**Interfaces:**
- Consumes: Step 2's collected-changes file list (already computed for any
  `changes`-scoped run) and Step 7's per-check verdicts (already consumed by
  the shipped flagged-file half of this same sub-step).
- Produces: the widened `## What has no test` section content.

- [ ] **Step 1: Write the fixtures — five controls**

`test/fixtures/touched-file-coverage/covered/Widget.tsx` and
`Widget.test.tsx` — touched in the feature commit, has a real covering test.
**Must not appear anywhere in the section.**

```tsx
// Widget.tsx
export function Widget() {
  return <p>ok</p>;
}
```

```tsx
// Widget.test.tsx
import { Widget } from "./Widget";

test("renders", () => {
  Widget();
});
```

`test/fixtures/touched-file-coverage/untested/WidgetA.tsx` through
`WidgetD.tsx` — four touched, clean (no defect), untested files. **Must name
exactly three and count the fourth** — the cap discrimination test:

```tsx
export function Widget() {
  return <p>ok</p>;
}
```
(identical content for A, B, C, D — only the filename varies)

`test/fixtures/touched-file-coverage/flagged-untested/Widget.tsx` — touched,
untested, **and** trips `Nothing pretends to be finished` (reusing the
established unlabelled-stub shape). **Must appear once, in the existing
flagged-file part of the section, never duplicated into the new touched-file
part:**

```tsx
export function Widget() {
  return <p>{"+9% this week"}</p>;
}
```

`test/fixtures/touched-file-coverage/untouched/Widget.tsx` — exists only in
the **base** commit, untested, never touched by the feature commit. **Must
not appear anywhere** — the scope-discrimination control, proving "touched"
is read from the actual diff, not from every untested file in the tree:

```tsx
export function Widget() {
  return <p>ok</p>;
}
```

`test/fixtures/touched-file-coverage/README.md`:

```markdown
# Fixtures: touched-file test coverage

Five controls, each isolating one rule the widened "What has no test" logic
must get right. All are touched in a feature commit layered on a base commit
— see the plan's Testing Reality section for how to assemble the two-commit
scratch repo these are copied into.

| Fixture | Touched? | Flagged by a check? | Has a test? | Must appear as |
|---|---|---|---|---|
| `covered/` | Yes | No | Yes | nowhere |
| `untested/WidgetA-C.tsx` | Yes | No | No | named (3 of 4) |
| `untested/WidgetD.tsx` | Yes | No | No | counted, not named ("and 1 more") |
| `flagged-untested/` | Yes | Yes (`Nothing pretends to be finished`) | No | once, in the flagged-file part only |
| `untouched/` | **No** (base commit only) | — | No | nowhere |

**Invariants:** if `untouched/Widget.tsx` appears anywhere in the section, the
check is scanning the whole tree instead of the diff, and is wrong. If
`flagged-untested/Widget.tsx` appears twice, the two halves of the section
aren't deduplicating against each other.
```

- [ ] **Step 2: Widen the `SKILL.md` sub-step**

Extend the existing "Naming test gaps" text (inserted by `407fb8e`) with:

> **When `TARGET_KIND` is `changes`**, also consider every file in Step 2's
> collected changes matching the dispatched checks' source extensions
> (`**/*.tsx`, `**/*.jsx`, `**/*.ts`, `**/*.js`, `**/*.vue`, `**/*.svelte`),
> excluding test/story/fixture/mock files by the same names used throughout
> the checks. Skip any file already named in the flagged-file part above — it
> is not named twice.
>
> For each remaining touched file, run the same reference search as above. If
> no test file references it, add it to a second list within the same
> section. Name at most three; beyond that, "and N more of the same kind."
> If every touched file is either already named above, has a test, or there
> are none to consider (including whenever `TARGET_KIND` is `project`), that
> second list is simply absent — the section still reads exactly as it did
> before this plan in that case.

- [ ] **Step 3: Extend the `HANDOFF.md` template example**

In `report-format.md`, extend the `What has no test` template block with a
second worked line showing the touched-file case, e.g.:

```markdown
## What has no test
- `src/PricingCard.tsx` (flagged above for "Nothing pretends to be
  finished"): no test file references it.
- `src/Sidebar.tsx`, `src/Footer.tsx`, `src/Header.tsx` (touched by this
  change, no defect flagged): no test file references any of them, and 2
  more of the same kind.
```

- [ ] **Step 4: Build the two-commit scratch repo and verify live**

Per this plan's Testing Reality section — a base commit with only
`untouched/Widget.tsx`, then a `feature` branch commit adding `covered/`,
`untested/`, and `flagged-untested/`. Reinstall the plugin, run `/vet` bare
from a session rooted at the scratch repo (auto-detects `changes` against
`base`).

**Expected — all five, or the task is not done:**
1. `flagged-untested/Widget.tsx` appears once, in the existing flagged-file
   part, naming `Nothing pretends to be finished`.
2. `untested/WidgetA.tsx`, `WidgetB.tsx`, `WidgetC.tsx` are named in the new
   touched-file part; `WidgetD.tsx` is folded into "and 1 more."
3. `covered/Widget.tsx` appears nowhere.
4. `untouched/Widget.tsx` appears nowhere, despite having no test — proving
   the scope is the diff, not the tree.
5. `flagged-untested/Widget.tsx` does not also appear in the touched-file
   part — proving the two halves deduplicate.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Widen What has no test to cover touched, unflagged files

The shipped version (407fb8e) only named a test gap for a file a
dispatched check already flagged as defective -- a touched file that is
otherwise clean and has zero test coverage was invisible. Widens the
same Step 9 sub-step, changes-scope only, to also name touched files
with no test at all, deduplicated against the already-flagged half and
capped at three named plus a count -- same noise controls as every
check already carries, so a large PR doesn't produce a wall of text in
the one document meant to stay skimmable.

Deliberately not widened to project scope: that would become a general
whole-codebase test-coverage audit, the exact scope creep the original
design rejected. An untested-but-otherwise-clean project still sails
through outside changes-scope, on purpose.

Five fixtures: a covered touched file, four untested touched files
(proving the three-plus-count cap), a flagged-and-untested file
(proving no duplication across the two halves), and a file touched by
neither commit -- present only in the base -- proving scope reads the
diff, not the tree."
```

---

## Verification summary

| Task | Live run proves |
|---|---|
| 1 | Flagged file still named once; 3-of-4 untested touched files named + counted; covered file absent; untouched-in-base file absent; no duplication across the two halves |

## Gaps this plan does not close

Carried forward, deliberately:

1. **`project`-scope runs still sail through with zero tests**, as before —
   this plan is `changes`-scope only, on purpose (see Global Constraints).
2. **Test quality is still never judged**, for either half of the section.
3. **A test importing the touched file for an unrelated reason** (a shared
   constant, say) still reads as covered — the same accepted tradeoff the
   shipped feature already carries.
