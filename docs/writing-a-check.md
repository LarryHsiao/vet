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
  otherwise. No shipped check declares this today: a "did this match the ask"
  fidelity check was considered and deliberately not built — judging intent
  from the same artifact being judged is tautological, and intent transfers
  fine through tickets and conversation without Vet's help.

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
text.

The pattern, as used in `everything-needed-is-here.md`:

> Do not suggest deleting the import to make the error disappear, and do not
> suggest a lint suppression — the code needs the thing it is asking for.

This matters more here than in a normal linter. The person reading the report
will paste the fix straight back to an AI assistant, and an assistant asked to
"make this check pass" will reach for the suppression first — it is faster and
it works. The next run then comes back green with the defect still shipping,
which is worse than never having checked.

## Distinguish dishonest from unfinished

Not every defect this tool looks for is a pattern that's always wrong. Handing
off half-built work is legitimate and common — the defect is a stub that
**presents itself as finished**. When a check's subject is like that, write
`Pass when` so a labelled stub passes on purpose: a comment naming what's
missing (`// STUB:`), a clearly-named symbol (`SAMPLE_TEAM`), or visible UI
text saying the data is sample. Prefer requiring a label over banning a
pattern outright — banning hardcoded arrays outright would also catch honest,
labelled placeholder data, and an assistant asked to "make this pass" would
delete the label rather than finish the work, which is the opposite of what
the check exists to encourage. See `nothing-pretends-to-be-finished.md`'s
`Pass when`/`Fail when` split, and the `PricingCard.tsx` (unlabelled, must
trip) / `TeamList.tsx` (labelled, must pass) pair under
`test/fixtures/pretends-finished/` that proves it discriminates on the label,
not on the shape.

## Adding a check: the checklist

1. Write the check file under `skills/vet/checks/`.
2. Add a matching case under its own directory in `test/fixtures/` — a small
   file that should trip the new check, and ideally one that should clearly
   pass it (see `PricingCard.tsx`'s and `TeamList.tsx`'s roles in the
   `nothing-pretends-to-be-finished` check, under
   `test/fixtures/pretends-finished/`: both are the same stub shape, but
   `TeamList.tsx` carries a `STUB:` comment and visible "sample data" text, so
   it must **not** be flagged, proving the check discriminates on the label
   rather than pattern-matching on shape). The fixture directories today are
   `test/fixtures/pretends-finished/`, `test/fixtures/missing-pieces/`, and
   `test/fixtures/leaked-secrets/`, one per dispatched check. This path sits
   under a directory literally named `fixtures/`, which every check's own
   `Do not flag` section tells it to ignore — that would silently defeat the
   whole smoke test. `SKILL.md` Step 6 carries a standing "Fixture-exclusion
   clarification" in every check's dispatch prompt for exactly this: a file
   whose stated purpose (a sibling README, in this case) is to trip the check
   is evaluated as real code, not exempted. Don't duplicate that clarification
   per check — it lives once, at the protocol level.
3. Run the verification procedure in the project's plan history (negative
   control, positive control, `n/a` path) against the new check specifically.
