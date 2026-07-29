# Report format — worked examples

This file is the rendering reference for `SKILL.md` Step 8. It exists so the
report's *voice* can be tuned without touching dispatch logic.

## Wire spec (recap)

Every run mints a fresh `<RUNTOKEN>` (6+ random alphanumerics) shared by all its
checks. Both the verdict line and the detail sentinels carry it:

```
VET-<RUNTOKEN>-<N>|<pass|fail|n/a>|<short note>
===VET-DETAIL-<RUNTOKEN>-<N>===
[WHAT]
...
[FIX]
...
===END-VET-DETAIL-<RUNTOKEN>-<N>===
```

The token is not decoration. Without it, a check that helpfully restates the
reply format before answering has its own quoted example parsed as its verdict
— and since the canonical example is a `pass`, that yields a silent all-clear
from a check that never looked at anything. A per-run token makes every example
in every document inert, and the parser takes the **last** matching line rather
than the first, so a template echoed ahead of the real answer cannot win.

The detail block is emitted only on `fail`, is optional from the parser's point
of view (a missing or malformed block degrades the row, never drops it), and is
never rewritten — only reflowed and capped.

## The table is fixed; the prose is not

Result cells hold exactly one of `Fix this`, `Looks fine`, `Doesn't apply`,
`Didn't finish`, or `Couldn't run` — no bold, no em-dash, no appended note or
count. Headings are `### <N>. <name>`, with a period.

The same code checked twice must produce byte-identical table rows, so someone
can see at a glance that nothing moved. Explanations below the table will vary
in wording between runs; the table must not.

## Default (batch) report

Any **Fix this** row — mechanical or dispatched — earns a hold verdict as the
very first line, before `TARGET_SENTENCE`:

```
> **Hold — 2 things need fixing before this is ready to hand off.**

I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result       |
|---|-----------------------------------------------|--------------|
| 1 | Everything it needs is actually here          | Fix this     |
| 2 | No private keys or config left in the code    | Fix this     |
| 3 | Nothing pretends to be finished                | Looks fine   |

**2 things to fix. 3 of 3 checks completed.**

### 1. Everything it needs is actually here

**What's wrong**
`src/App.tsx` imports `date-fns`, which isn't listed in `package.json` — a
fresh install won't have it — and imports `./Sidebar`, a file that doesn't
exist anywhere in the project. Both work on the machine that built them and
break the moment someone else clones the repo.

> In package.json, add `date-fns` to dependencies at the version this project
> needs. Then either create src/Sidebar.tsx with the component src/App.tsx
> expects, or remove the import if the sidebar was never meant to ship yet. Do
> not delete the date-fns import to make the error disappear — the code needs
> the thing it's asking for.

### 2. No private keys or config left in the code

**What's wrong**
`src/config.ts` hardcodes a live Stripe secret key and a database connection
string with its password in plain text. Both are committed to the project's
history now, and anyone with read access to the repo — including whoever reads
this report next — can use them as-is.

> Revoke the Stripe key referenced in src/config.ts and issue a new one; do
> the same for the database password. Move both new values into a `.env` file
> that's git-ignored, read them with `process.env`, and add their variable
> names — not the values — to `.env.example`. Deleting the lines here does not
> un-leak them; they remain reachable in the project's history until rotated.

I checked how this was built, not whether it does what you asked for. To check
that too, run `/vet "describe what you asked for"`.
```

## All-clear

```
I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result       |
|---|-----------------------------------------------|--------------|
| 1 | Everything it needs is actually here          | Looks fine   |
| 2 | No private keys or config left in the code    | Looks fine   |
| 3 | Nothing pretends to be finished                | Looks fine   |

**0 things to fix. 3 of 3 checks completed.**

I checked how this was built, not whether it does what you asked for. To check
that too, run `/vet "describe what you asked for"`.
```

Zero **Fix this** rows means no hold line. Step 10's offer to open a PR/MR
(SKILL.md) needs one more thing beyond that — every row must also have
reached a definitive result, with no **Didn't finish** row (`M == T`) — and
this example qualifies on both counts, so it's also what triggers that offer,
asked only after this report and `HANDOFF.md` are both written.

## Edge cases

```
This project isn't tracked in Git, so I checked the whole thing.

| # | What I checked                              | Result           |
|---|-----------------------------------------------|------------------|
| 1 | Everything it needs is actually here          | Doesn't apply    |
| 2 | No private keys or config left in the code    | Didn't finish    |
| 3 | Nothing pretends to be finished                | Doesn't apply    |

**0 things to fix. 2 of 3 checks completed.**

Check 2 didn't reply in the expected format:

    (raw reply dumped here, verbatim, in a fenced block)
```

Here `T` (total rows) is 3, but `M` (rows that reached a definitive result) is
only 2 — the two `n/a` rows resolved cleanly, while row 2 timed out and never
reached one, so it doesn't count toward `M` even though it still occupies a row.

`n/a` rows cost nothing — the `applies_to` shortcut skips the agent entirely
when no collected file matches, so a report can read `Doesn't apply` across the
board with zero agents dispatched, and still count as "completed" for this
footer.

## Mechanical rows plus dispatched checks

Step 5's mechanical rows sit in the same table as the dispatched checks, so
they count in the same footer — `T` and `M` describe every row on screen, not
just the dispatched ones:

```
> **Hold — 1 thing needs fixing before this is ready to hand off.**

I checked the 4 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result        |
|---|-----------------------------------------------|---------------|
| 1 | The code compiles                             | Fix this      |
| 2 | The project's tests pass                      | Couldn't run  |
| 3 | The project's linter passes                    | Looks fine    |
| 4 | Everything it needs is actually here          | Looks fine    |
| 5 | No private keys or config left in the code    | Didn't finish |

**1 thing to fix. 4 of 5 checks completed.**

### 1. The code compiles

**What's wrong**
... (the compiler's own error output, rendered as this row's finding)

Check 5 didn't reply in the expected format:

    (raw reply dumped here, verbatim, in a fenced block)
```

Five rows on screen, so `T` is 5. `M` is 4: row 1's compile failure, row 2's
`Couldn't run`, row 3's pass, and row 4's pass are each a completed
determination — `Couldn't run` means Vet knows exactly why nothing ran, which
is as definitive as a pass or a fail. Only row 5's timeout leaves its check
without an answer, so it alone is the one row that doesn't count toward `M`.
`N` is 1 — only row 1 is `Fix this`; a mechanical `Couldn't run` is never a
failure, and neither is a dispatched `Didn't finish`.

## Stop-and-ask (saved work plus unsaved work on the same branch)

No table at all — this is Step 2's own early exit, before any check is
dispatched:

```
You have work here that's already saved, plus some newer changes that aren't
saved yet. Save those newer changes first — commit them the way you normally
would — then run /vet again and I'll check all of it together.
```

This only fires during auto-detection (bare `/vet`), never for an explicit
target like `/vet all` or `/vet recent`. Vet never commits, stashes, or undoes
anything itself; it only asks. Say **save**, never *discard*, *clear out*,
*reset*, or *stash* — naming those invites a non-technical person to destroy
work they cannot recover.

## Gated mode (`/vet --gated`)

The table and count render immediately — the whole picture, up front — but only
the first **Fix this** section follows:

```
> **Hold — 2 things need fixing before this is ready to hand off.**

I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                              | Result       |
|---|-----------------------------------------------|--------------|
| 1 | Everything it needs is actually here          | Fix this     |
| 2 | No private keys or config left in the code    | Fix this     |
| 3 | Nothing pretends to be finished                | Looks fine   |

**2 things to fix. 3 of 3 checks completed.**

### 1. Everything it needs is actually here

**What's wrong**
... (identical to the batch example above)

> ... (identical fix instruction)

Reply `next` to see finding 2 of 2, or start fixing this one.
```

The turn ends there. On the next message ("next"), finding 2 renders the same
way, followed by the intent footer since none was given. There is no separate
state file — position is tracked by what has already appeared in the
conversation.

## Status → presentation

| Wire status | Rendered as     |
|---|---|
| `pass` | Looks fine |
| `fail` | Fix this |
| `n/a` | Doesn't apply |
| unparseable / timeout | Didn't finish |

Mechanical rows (Step 5) don't use the wire protocol — they're not dispatched
agents — and carry a fifth presentation, **Couldn't run**, used only when a
row's source resolves but the command can't actually execute. It never counts
as a failure, and it always comes with the one-line reason and the command
that would fix it:

```
The project's tests pass — Couldn't run

This project has its own tests, but its dependencies aren't installed, so I
couldn't run them. Run `npm install` in this folder and try /vet again to
include them.
```

`The code compiles`, `The project's tests pass`, and `The project's linter
passes` each resolve independently from their own source. A row whose source
doesn't resolve at all gets **no row** — silence, not a "skipped" row. There is
nothing to install and nothing to fix, and a skipped row would read as a chore
the person is expected to go and complete.

The wire protocol stays `pass`/`fail`/`n/a` regardless of presentation — a
future voice change (terser, for an engineer audience) only touches this table,
never the check files or the dispatch contract.

## `HANDOFF.md` template

```markdown
# Handoff notes

Written by Vet on <date>, against commit <short-sha> on branch <branch>.
If the code has changed since, re-run `/vet` to refresh this file.

## What this is meant to do
<the intent argument if one was given; otherwise:>
Not recorded — no description was given when this was generated.

## What is real, and what is not
<one bullet per finding from "Nothing pretends to be finished", naming the
file and what is stubbed. If the check passed:>
Everything on screen appears to come from a real source.

## What it needs to run
<required environment variables from the secrets check, by name only, never
values; plus any missing packages or files from "Everything it needs is
actually here". If both passed:>
Nothing missing — a fresh clone should install and run.

## What is known-broken
<any mechanical row that failed, quoted plainly: "The code compiles — failing".
If none failed or none ran:>
Nothing known-broken at the time of writing.

## What has no test
<one line per Fix-this dispatched-check finding, naming whether any test file
actually references the flagged file. On a changes-scoped run, also a second
list of touched-but-unflagged files with no test at all, capped at three plus
a count. If none of the dispatched checks failed and nothing touched lacks a
test:>
Nothing flagged, so nothing to name here.

<worked example of both halves together:>
- `src/PricingCard.tsx` (flagged above for "Nothing pretends to be
  finished"): no test file references it.
- `src/Sidebar.tsx`, `src/Footer.tsx`, `src/Header.tsx` (touched by this
  change, no defect flagged): no test file references any of them, and 2
  more of the same kind.

## What the person actually tried
<their answer, verbatim; otherwise:>
Not recorded.

## What Vet did not check
Vet checks how this was built, not whether it does what was asked for. It also
does not check visual design, mobile layout, or performance.
```

Every section is always present. An empty section says so in words rather than
being omitted — a missing heading reads as "not applicable", while "Not
recorded." correctly reads as "nobody knows". `What has no test` follows the
same rule: "Nothing flagged, so nothing to name here" reads as "checked, found
nothing to report," not as the section having been skipped.
