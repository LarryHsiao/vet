# Fixtures: new logic lands without a test

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `useLiveSessions.ts` | **Yes** | `runLive`'s interpret-failure branch and `onRefineTurn`'s error branch are new logic with no test exercising either — only the happy path of each is covered in `useLiveSessions.test.ts`. |
| `sessionStorage.ts` | **No** | Same shape — a new function with a happy path and a failure branch (`loadStoredSessions`'s corrupt-data path) — but `sessionStorage.test.ts` tests both branches. |

**Invariant:** if a run flags `sessionStorage.ts`, the check is pattern-matching
on "has a try/catch" rather than checking whether each branch is actually
exercised, and is wrong.
