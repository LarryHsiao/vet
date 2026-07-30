# Fixtures: new logic lands without a test (Dart)

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `lib/live_session_controller.dart` | **Yes** | `runLive`'s interpret-failure branch and `onRefineTurn`'s error branch are new logic with no test exercising either — only the happy path of each is covered in `test/live_session_controller_test.dart`. |
| `lib/session_storage.dart` | **No** | Same shape — a new function with a happy path and a failure branch (`loadStoredSessions`'s corrupt-data path) — but `test/session_storage_test.dart` tests both branches. |

**Invariant:** if a run flags `session_storage.dart`, the check is
pattern-matching on "has a try/catch" rather than checking whether each branch
is actually exercised, and is wrong.
