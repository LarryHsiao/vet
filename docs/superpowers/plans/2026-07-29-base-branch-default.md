# Base-Branch Diff As Default Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `skills/vet/SKILL.md`'s Step 2 target-detection cascade so
that diffing against the resolved base branch is the only silent auto-detected
path, and every other case — no Git tracking, an unresolvable base, or a clean
tree sitting on the base branch itself — stops and asks the person rather than
silently falling back to a whole-project or last-commit check.

**Architecture:** This is a single-file prose edit to an LLM-facing
instruction document (`skills/vet/SKILL.md` is not executable code — it is
read and followed by Claude at `/vet` invocation time). There is no compiler
or test runner for it. Verification instead means constructing real git
repositories in scratch directories that reproduce each branch of the
decision cascade, then dispatching a fresh subagent — one with no other
context, exactly as `/vet` itself dispatches its checks — carrying only the
relevant instruction text and that repo's actual `git` output, and confirming
it reaches the decision the spec calls for. This mirrors how the project
already verifies its own dispatched checks (fixtures fed to fresh agents),
applied here to the routing logic instead of a check body.

**Tech Stack:** Markdown (the skill file itself), bash + git (scratch
scenario construction), the `Agent` tool (probe dispatch).

## Global Constraints

- Never say *diff*, *HEAD*, *merge-base*, *working tree*, *staged*, or *SHA*
  in anything the person using `/vet` will read (`SKILL.md` line 154,
  restated at line 557) — every new sentence written into Step 2 must honor
  this.
- The base-resolution order itself is unchanged: `origin/HEAD`, then
  `origin/main`, `origin/master`, `origin/develop`, `origin/trunk`, then the
  local `main`, `master`, `develop`, `trunk` — remote-tracking ref preferred.
- The whole-project size gate (400-file threshold, `SKILL.md` line 146) is
  unchanged and untouched by this task; it still fires whenever whole-project
  mode is entered, regardless of how that mode was reached.
- `TARGET_KIND` (`changes` or `project`) and `TARGET_SENTENCE` (the
  plain-English opening line) must be set for every path through the
  cascade, including the three newly-interactive ones — later steps
  (`SKILL.md` lines 151, 186, 436, 514, 525) consume both unconditionally.
- Scratch scenario repositories live under this session's scratchpad
  directory (`/private/tmp/claude-501/-Users-larryhsiao-vet/285d8433-683c-4e76-90af-77243f23fe77/scratchpad`),
  never under the `vet` project tree itself.

---

### Task 1: Replace Step 2's target-detection cascade

**Files:**
- Modify: `skills/vet/SKILL.md:86-132` (the `Run, in order...` cascade
  through the closing "If the user gave `all`, `recent`, or a path..."
  paragraph)
- No new permanent test fixtures — the project's existing fixture
  convention (`test/fixtures/*`) covers the three *dispatched checks*
  (content inspected by a check's agent); the target-detection cascade is
  routing logic with no analogous existing pattern, and this task doesn't
  need to invent a permanent one to verify a wording change. Verification
  scratch repos are constructed and discarded within this task's steps.

**Interfaces:**
- Consumes: nothing from an earlier task (first and only task).
- Produces: `TARGET_KIND` and `TARGET_SENTENCE`, exactly as today, for every
  cascade path — every later step in `SKILL.md` that reads these two
  variables keeps working unmodified.

- [ ] **Step 1: Construct the three scratch scenarios whose behavior is changing**

Run in the Bash tool (adjust the scratchpad path if your session's differs):

```bash
SCRATCH=/private/tmp/claude-501/-Users-larryhsiao-vet/285d8433-683c-4e76-90af-77243f23fe77/scratchpad
rm -rf "$SCRATCH/vet-cascade-probe"
mkdir -p "$SCRATCH/vet-cascade-probe"

# Scenario A: no Git tracking at all (rule 1)
mkdir -p "$SCRATCH/vet-cascade-probe/A-no-git"
echo '{"name":"a"}' > "$SCRATCH/vet-cascade-probe/A-no-git/package.json"

# Scenario B: clean tree, standing on the base branch itself (rule 4).
# A repo whose only branch is "main", with no remote at all, so base
# resolution falls to the *local* main and finds zero commits ahead of it
# (HEAD long since IS main).
mkdir -p "$SCRATCH/vet-cascade-probe/B-on-base"
git -C "$SCRATCH/vet-cascade-probe/B-on-base" init -q -b main
echo '{"name":"b"}' > "$SCRATCH/vet-cascade-probe/B-on-base/package.json"
git -C "$SCRATCH/vet-cascade-probe/B-on-base" add -A
git -C "$SCRATCH/vet-cascade-probe/B-on-base" -c user.email=t@t.com -c user.name=t commit -q -m "init"

# Scenario C: no base resolves at all, clean tree, no uncommitted changes
# (rule 5). A branch name outside the known list, no remote configured.
mkdir -p "$SCRATCH/vet-cascade-probe/C-no-base"
git -C "$SCRATCH/vet-cascade-probe/C-no-base" init -q -b feature/no-base-here
echo '{"name":"c"}' > "$SCRATCH/vet-cascade-probe/C-no-base/package.json"
git -C "$SCRATCH/vet-cascade-probe/C-no-base" add -A
git -C "$SCRATCH/vet-cascade-probe/C-no-base" -c user.email=t@t.com -c user.name=t commit -q -m "init"

echo "--- A ---"; (cd "$SCRATCH/vet-cascade-probe/A-no-git" && git rev-parse --show-toplevel 2>&1)
echo "--- B ---"; (cd "$SCRATCH/vet-cascade-probe/B-on-base" && git status --porcelain; git branch --show-current; git rev-list --count main..HEAD 2>&1)
echo "--- C ---"; (cd "$SCRATCH/vet-cascade-probe/C-no-base" && git status --porcelain; git branch --show-current; git rev-parse --verify origin/HEAD 2>&1; git rev-parse --verify main 2>&1)
```

Expected: `A` prints a `fatal: not a git repository` (or similar) error from
`git rev-parse --show-toplevel`. `B` prints an empty `git status --porcelain`,
`main` as the current branch, and `0` for commits ahead of `main`. `C` prints
an empty `git status --porcelain`, `feature/no-base-here` as the current
branch, and `fatal:` errors for both `origin/HEAD` and `main` (no such refs
exist).

- [ ] **Step 2: Probe the CURRENT SKILL.md text against A, B, C — confirm today's silent fallback (the behavior being replaced)**

For each scenario, dispatch a fresh `Agent` call (subagent_type
`general-purpose`, this is a read-only reasoning probe — no file edits) with
this exact prompt shape, substituting the scenario's git output:

```
You are given a decision procedure and the actual state of a git repository.
Follow the procedure literally and state your conclusion — do not guess at
intent beyond what the procedure says.

Decision procedure:
"""
1. `git rev-parse --show-toplevel` fails → target: project (whole tree).
2. Current branch has commits ahead of its base — check `git status --porcelain`
   before deciding what this means. [base resolution: origin/HEAD, then
   origin/main, origin/master, origin/develop, origin/trunk, then local main,
   master, develop, trunk — prefer the remote-tracking ref.] Counting commits
   ahead: `git rev-list --count <base>..HEAD`. Greater than zero means this
   rule applies. If no base resolves at all, skip to rule 3.
   - Non-empty (dirty) → stop, ask the person to commit first.
   - Empty (clean) → target: changes, diffed against the merge-base.
3. `git status --porcelain` is non-empty (and rule 2 didn't apply) → target:
   changes (uncommitted).
4. Clean tree, on the default branch → target: changes, `git show HEAD`.
5. Anything else → target: project.
"""

Repository state:
"""
<paste this scenario's captured git output from Step 1 here>
"""

Which numbered rule applies, what TARGET_KIND does it produce (changes or
project), and does anything get shown to the person before checking proceeds?
```

Run this for A, B, and C. Expected results — the *undesired* behavior this
task removes: A concludes rule 1, `target: project`, nothing shown to the
person first. B concludes rule 4, `target: changes` (via `git show HEAD`),
nothing shown to the person first. C concludes rule 5, `target: project`,
nothing shown to the person first. If any probe disagrees with this, stop and
re-examine the scenario construction in Step 1 before continuing — the
baseline must reproduce the exact silent behavior the spec describes, or the
later comparison proves nothing.

- [ ] **Step 3: Replace `SKILL.md:86-132` with the new cascade**

Use the `Edit` tool to replace the entire block from `Run, in order, stopping
at the first that applies:` through `...in step 2 only applies to
auto-detection, never to an explicit target.` with:

```markdown
Run, in order, stopping at the first that applies:

1. `git rev-parse --show-toplevel` fails → stop before checking anything.
   Call `AskUserQuestion` once: check the whole project, or point at a
   folder (offer any folders visible at the project's top level as
   candidates, alongside "check everything"). Proceed with whichever is
   chosen, exactly as if the person had typed `/vet all` or `/vet <folder>`
   themselves, and build `TARGET_SENTENCE` to match that choice (e.g. "This
   project isn't tracked in Git, so I checked the whole thing." for whole
   project; the same folder-target phrasing an explicit `/vet <folder>`
   would use, otherwise).
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
   chosen, and build `TARGET_SENTENCE` to match (e.g. "Nothing is unsaved,
   so I checked the most recent batch of changes." if the last commit is
   chosen).
5. No base branch resolves at all, the tree is clean, and rule 3 didn't
   already apply → stop before checking anything. Call `AskUserQuestion`
   once, offering: name a branch to diff against (if one is given, resolve
   it with `git rev-parse --verify <name>` and diff against its merge-base,
   same as rule 2's clean case), the whole project, or a folder. Proceed
   with whichever is chosen.

If the user gave `all`, `recent`, or a path explicitly, use that target and
build the matching sentence instead of running this cascade — the
stop-and-ask cases above only apply to auto-detection, never to an explicit
target.
```

- [ ] **Step 4: Probe the NEW SKILL.md text against A, B, C — confirm each now stops to ask**

Repeat Step 2's exact probe dispatches (same three git states, same
`Agent` call shape), but this time paste the **new** rules 1, 2, 4, 5 text
from Step 3 into the "Decision procedure" block instead of the old text
(rule 3 is unchanged, include it verbatim for completeness).

Expected: A now concludes rule 1 and reports that `AskUserQuestion` is
called before any target is fixed, offering whole-project or a folder. B now
concludes rule 4 and reports `AskUserQuestion` is called, offering last
commit, whole project, or a folder. C now concludes rule 5 and reports
`AskUserQuestion` is called, offering naming a branch, whole project, or a
folder. If any probe still reports a silent decision with nothing shown to
the person, the wording is still ambiguous — revise Step 3's text (most
likely the rule's opening condition) and re-run this step before moving on.

- [ ] **Step 5: Regression-probe the three UNCHANGED branches**

Construct two more scratch scenarios and probe them against the new text
to confirm nothing shifted for the paths that were never meant to change:

```bash
# Scenario D: branch ahead of a resolvable base, clean tree (rule 2, clean).
mkdir -p "$SCRATCH/vet-cascade-probe/D-ahead-clean"
git -C "$SCRATCH/vet-cascade-probe/D-ahead-clean" init -q -b main
echo '{"name":"d"}' > "$SCRATCH/vet-cascade-probe/D-ahead-clean/package.json"
git -C "$SCRATCH/vet-cascade-probe/D-ahead-clean" add -A
git -C "$SCRATCH/vet-cascade-probe/D-ahead-clean" -c user.email=t@t.com -c user.name=t commit -q -m "init"
git -C "$SCRATCH/vet-cascade-probe/D-ahead-clean" checkout -q -b feature/x
echo "change" >> "$SCRATCH/vet-cascade-probe/D-ahead-clean/package.json"
git -C "$SCRATCH/vet-cascade-probe/D-ahead-clean" add -A
git -C "$SCRATCH/vet-cascade-probe/D-ahead-clean" -c user.email=t@t.com -c user.name=t commit -q -m "feature work"

# Scenario E: uncommitted changes only, zero commits ahead (rule 3).
mkdir -p "$SCRATCH/vet-cascade-probe/E-uncommitted"
git -C "$SCRATCH/vet-cascade-probe/E-uncommitted" init -q -b main
echo '{"name":"e"}' > "$SCRATCH/vet-cascade-probe/E-uncommitted/package.json"
git -C "$SCRATCH/vet-cascade-probe/E-uncommitted" add -A
git -C "$SCRATCH/vet-cascade-probe/E-uncommitted" -c user.email=t@t.com -c user.name=t commit -q -m "init"
echo "wip" >> "$SCRATCH/vet-cascade-probe/E-uncommitted/package.json"

echo "--- D ---"; (cd "$SCRATCH/vet-cascade-probe/D-ahead-clean" && git status --porcelain; git branch --show-current; git rev-list --count main..HEAD)
echo "--- E ---"; (cd "$SCRATCH/vet-cascade-probe/E-uncommitted" && git status --porcelain; git branch --show-current; git rev-list --count main..HEAD)
```

Probe D and E the same way as Step 4, using the new rules text. Expected: D
concludes rule 2's clean case, `target: changes` diffed against the
merge-base, no `AskUserQuestion` call — unchanged from before this task. E
concludes rule 3, `target: changes` (uncommitted), no `AskUserQuestion`
call — unchanged. If either now stops to ask, Step 3's wording bled into a
branch it shouldn't have — revise and re-run Step 4 and this step.

- [ ] **Step 6: Clean up the scratch scenarios**

```bash
rm -rf "$SCRATCH/vet-cascade-probe"
```

- [ ] **Step 7: Commit**

```bash
git add skills/vet/SKILL.md
git commit -m "Ask instead of silently falling back when no base-branch diff is possible"
```

---

## Self-Review Notes

- **Spec coverage:** all five spec points map to Task 1: rule 1 (no Git) →
  Step 3's new rule 1; rule 2 clean (the elevated default) → unchanged text,
  reasoning made explicit ("This is the default path..."); rule 3
  (uncommitted) → confirmed unchanged via Step 5's scenario E; rule 4
  (clean, on the base itself) → Step 3's new rule 4; rule 5 (base
  unresolvable) → Step 3's new rule 5. The explicit-target override
  paragraph and the dirty-branch stop are both confirmed unchanged (Step 5
  covers dirty implicitly by leaving its wording untouched in Step 3; it was
  never in the changed set).
- **No placeholders:** every step carries literal bash, literal probe prompt
  text, and literal replacement markdown — nothing deferred to "add
  appropriate wording."
- **Type/name consistency:** `TARGET_KIND` and `TARGET_SENTENCE` are the only
  two identifiers this task's output must produce, and both are named
  identically to their existing uses at `SKILL.md:151-152` and every later
  consumer — no new identifiers introduced.
