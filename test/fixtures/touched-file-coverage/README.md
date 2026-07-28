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
