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
