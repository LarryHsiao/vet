# Fixtures: new logic lands without a test (Go)

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `session/live_session.go` | **Yes** | `RunLive`'s interpret-failure branch and `OnRefineTurn`'s error branch are new logic with no test exercising either — only the happy path of each is covered in `session/live_session_test.go`. |
| `session/storage.go` | **No** | Same shape — a new function with a happy path and a failure branch (`LoadStoredSessions`'s corrupt-data path) — but `session/storage_test.go` tests both branches. |

**Invariant:** if a run flags `storage.go`, the check is pattern-matching on
"has an error return" rather than checking whether each branch is actually
exercised, and is wrong.
