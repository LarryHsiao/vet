# Fixtures: nothing pretends to be finished (Go)

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `handlers/pricing.go` | **Yes** | Returns a hardcoded plan list with an invented "+12% this month" and no database or service call behind it — nothing marks it as sample. It reads as finished. |
| `handlers/team.go` | **No** | Returns an honest `http.StatusNotImplemented` with a comment explaining why. This is the labelled-stub route, not a fake success. |

**Invariant:** if a run flags `handlers/team.go`, the check is treating an
honest "not implemented" response as if it were a hidden fake, and is wrong.
