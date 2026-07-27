# Fixtures: nothing pretends to be finished

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `PricingCard.tsx` | **Yes** | Hardcoded plans with an invented "+12% this month", a placeholder image host, and a checkout that only logs — none of it labelled. It reads as finished. |
| `TeamList.tsx` | **No** | The same stub shape, but a `STUB:` comment states what is missing and the UI says "sample data". Honest, so it passes. |

**Invariant:** if a run flags `TeamList.tsx`, the check is pattern-matching on
stub-shaped code rather than applying its rule, and is wrong.
