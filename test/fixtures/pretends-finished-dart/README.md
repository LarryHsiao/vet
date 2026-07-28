# Fixtures: nothing pretends to be finished (Dart/Flutter)

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `pricing_card.dart` | **Yes** | Hardcoded plans with an invented "+12% this month", a placeholder image host, and an `onPressed` wired to nothing — none of it labelled. It reads as finished. |
| `team_list.dart` | **No** | The same stub shape, but a `STUB:` comment states what is missing and the UI says "(sample data)". Honest, so it passes. |

**Invariant:** if a run flags `team_list.dart`, the check is pattern-matching
on stub-shaped code rather than applying its rule, and is wrong.
