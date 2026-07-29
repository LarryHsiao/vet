# Base-branch diff as the default target

## Problem

`skills/vet/SKILL.md`'s target-detection cascade ("Choosing what to check")
silently falls back to whole-project scans in two places (a project with no
Git tracking; a branch whose base can't be resolved) and to a last-commit
check in a third (a clean tree sitting on the base branch itself). The
base-branch diff — comparing the current branch against its merge-base — is
meant to be the default way `/vet` checks a feature branch, but today it's
just one case among several silent fallbacks.

Whole-project analysis should only ever run when named explicitly as a
parameter (`/vet all`), never as an automatic fallback.

## New cascade

Replaces the current five rules in `SKILL.md`'s "Choosing what to check"
step, in order, stopping at the first that applies:

1. **No Git tracking at all** → stop, ask: run `/vet all` for the whole
   project, or `/vet <path>` for a folder.
   *(was: silent whole-project)*
2. **Base branch resolves, commits ahead of it > 0:**
   - Dirty (uncommitted changes on top of the committed work) → stop, ask to
     commit first. *(unchanged)*
   - Clean → diff against the merge-base. *(unchanged — this is the path
     being elevated to "the default")*
3. **Uncommitted changes present, zero commits ahead of base** (whether or
   not a base even resolved) → diff the uncommitted changes. *(unchanged —
   already branch-relative, not whole-project)*
4. **Clean tree, standing on the base branch itself** → stop, ask: check the
   last commit, the whole project, or a folder.
   *(was: silent last-commit via `git show HEAD`)*
5. **Base branch unresolvable, clean tree, no uncommitted changes** → stop,
   ask: name the base branch to diff against, or say whole-project/folder
   explicitly.
   *(was: silent whole-project)*

If the user gave `all`, `recent`, or a path explicitly, that target is used
directly and this cascade never runs — unchanged from today.

## Net effect

Rule 2's clean-branch-ahead case is the only remaining *silent* path into a
diff; every other terminus now requires either an explicit verb
(`all`/`recent`/a path) or an answered prompt. Rule 3 (uncommitted-only)
stays silent since it's inherently branch-scoped, not whole-project.

## Out of scope

- The base-resolution order itself (`origin/HEAD` → `origin/main` →
  `origin/master` → `origin/develop` → `origin/trunk` → local equivalents)
  is unchanged; only what happens once resolution succeeds or fails is being
  touched.
- The whole-project size gate (the 400-file `AskUserQuestion`) is untouched
  — it still fires only once whole-project mode is reached, whether via
  explicit `all` or via one of the new asks above choosing it.
- Rule 2's dirty-branch "commit first" message is unchanged.
