# Writing a check

Vet ships three checks today, not the whole intended set — this is the growth
path for adding the rest.

## Frontmatter

```yaml
---
name: A plain-English sentence describing what this check looks for
scope: [changes, project]      # or a single value; default is `changes`
applies_to: ["**/*.tsx"]       # optional glob list — skip the agent when nothing matches
requires: intent                # optional — only `intent` is meaningful today
---
```

- `name` is what the person reading the report sees. Write it as a plain
  sentence ("Screens handle waiting and failure"), not a rule identifier
  ("loading-states-check").
- `scope` decides which target this check rides for. Most checks should ride
  both `changes` and `project` — write the body so it reads sensibly under
  either ("Inspect the target for...", not "Inspect the diff for...").
- `applies_to` lets the dispatcher skip spending an agent when none of the
  collected files match — free `n/a` rows.
- `requires: intent` marks a check that only makes sense when the person gave
  `/vet` a quoted description of what they asked for. The dispatcher drops it
  otherwise. No shipped check declares this yet — it is reserved for a future
  "did this match the ask" check, which cannot be built honestly without an
  independent statement of intent (see `SKILL.md`'s design note on the fidelity
  check, in the project's plan history, for why).

## Body shape

Four parts, in order:

1. **A rationale paragraph.** Why this defect matters, in plain language — not
   "violates WCAG 2.1 AA," but what actually goes wrong for a real user, and why
   an AI assistant produces this particular mistake more often than a human
   would.
2. **`Pass when`** — the conditions that mean this is fine.
3. **`Fail when`** — the conditions that mean this needs fixing. Include, where
   relevant, that a suppression (an eslint-disable, an `@ts-ignore`, an
   `aria-hidden` slapped on to silence a warning) counts as a failure, not a fix.
4. **`Do not flag`** — the exclusion list.

**`Do not flag` should be the longest section, and this is deliberate.** A PM
cannot distinguish a false positive from a real finding — they will trust
whatever the report says. One bad row poisons trust in the entire report, not
just that row. Every check should explicitly exclude: vendored or scaffolded UI
(`components/ui/`, Radix, shadcn, generated clients), tests, stories, fixtures
and mocks, pre-existing debt in files a change merely touched (when scope is
`changes`), and a stated cap on how many instances to name (three, with "and N
more of the same kind").

## Caps every check must respect

The dispatcher enforces caps on the reply itself (`SKILL.md` Step 6's reply
contract: `[WHAT]` ≤ 8 lines, `[FIX]` ≤ 12 lines, at most 3 concrete instances
named), but a well-written check states its own "more than three instances" rule
in `Do not flag` so the dispatched agent doesn't have to infer it.

## Anti-suppression

If a check's `Fail when` names a suppression as a failure mode, the reply
contract requires the corresponding `[FIX]` to say explicitly not to use it. Say
this once in the check body so the dispatched agent carries it into the fix
text — see `no-secrets`-style checks in the parent `/nazgul` skill this design
is ported from for the pattern.

## Adding a check: the checklist

1. Write the check file under `skills/vet/checks/`.
2. Add a matching case to `test/fixtures/broken-ui/` — a small file that should
   trip the new check, and ideally one that should clearly pass it (see
   `TeamList.tsx`'s role in the `no-fake-data` check: it fetches real data, so
   it must **not** be flagged, proving the check discriminates rather than
   pattern-matching on messiness).
3. Run the verification procedure in the project's plan history (negative
   control, positive control, `n/a` path) against the new check specifically.
