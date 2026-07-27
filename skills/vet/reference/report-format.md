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

```
I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                          | Result       |
|---|------------------------------------------|--------------|
| 1 | Buttons and links work with a keyboard    | Fix this     |
| 2 | Screens handle waiting and failure        | Fix this     |
| 3 | Nothing on screen is fake data             | Looks fine   |

**2 things to fix. 3 of 3 checks completed.**

### 1. Buttons and links work with a keyboard

**What's wrong**
Three things that look and behave like buttons are built from plain `<div>`
elements with an onClick handler: `PricingCard.tsx` (the "Choose plan" tile),
`FilterBar.tsx` (the three sort chips), and `Modal.tsx` (the X in the corner).
Nothing about them tells the browser they are buttons. Someone using a keyboard
instead of a mouse — which includes every screen-reader user — cannot reach
these at all. For a paid-plan selector that is a blocked purchase.

> In src/components/PricingCard.tsx, src/components/FilterBar.tsx and
> src/components/Modal.tsx, replace every `<div onClick={...}>` that acts as a
> button with a real `<button type="button">` carrying the same className and
> onClick. Do not add `role="button"` and `tabIndex={0}` to keep the div — use
> the real element. For the X in Modal.tsx, add `aria-label="Close"` since it
> has no text. Do not silence any lint rule to make this pass.

### 2. Screens handle waiting and failure

**What's wrong**
`TeamList.tsx` returns nothing while the team list is loading, so the screen is
blank for however long the request takes, and the failure path is swallowed —
`.catch(() => {})` — so a request that fails looks identical to one that is
still loading. There is no way to tell the two apart, and no way to retry.

> In src/components/TeamList.tsx, render a loading skeleton while `members` is
> null, and render a message with a retry button when the fetch fails instead
> of silently catching the error. Do not remove the catch — replace it with one
> that sets an error state the component actually renders.

I checked how this was built, not whether it does what you asked for. To check
that too, run `/vet "describe what you asked for"`.
```

## All-clear

```
I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                          | Result       |
|---|------------------------------------------|--------------|
| 1 | Buttons and links work with a keyboard    | Looks fine   |
| 2 | Screens handle waiting and failure        | Looks fine   |
| 3 | Nothing on screen is fake data             | Looks fine   |

**0 things to fix. 3 of 3 checks completed.**

I checked how this was built, not whether it does what you asked for. To check
that too, run `/vet "describe what you asked for"`.
```

## Edge cases

```
This project isn't tracked in Git, so I checked the whole thing.

| # | What I checked                          | Result           |
|---|------------------------------------------|------------------|
| 1 | Buttons and links work with a keyboard    | Doesn't apply    |
| 2 | Screens handle waiting and failure        | Didn't finish    |
| 3 | Nothing on screen is fake data              | Doesn't apply    |

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
I checked the 4 files you changed but haven't saved to the project's history yet.

| # | What I checked                          | Result        |
|---|------------------------------------------|---------------|
| 1 | The code compiles                         | Fix this      |
| 2 | The project's tests pass                  | Couldn't run  |
| 3 | The project's linter passes               | Looks fine    |
| 4 | Buttons and links work with a keyboard    | Looks fine    |
| 5 | Screens handle waiting and failure        | Didn't finish |

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
I checked the 6 files you changed but haven't saved to the project's history yet.

| # | What I checked                          | Result       |
|---|------------------------------------------|--------------|
| 1 | Buttons and links work with a keyboard    | Fix this     |
| 2 | Screens handle waiting and failure        | Fix this     |
| 3 | Nothing on screen is fake data             | Looks fine   |

**2 things to fix. 3 of 3 checks completed.**

### 1. Buttons and links work with a keyboard

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

## What the person actually tried
<their answer, verbatim; otherwise:>
Not recorded.

## What Vet did not check
Vet checks how this was built, not whether it does what was asked for. It also
does not check visual design, mobile layout, or performance.
```

Every section is always present. An empty section says so in words rather than
being omitted — a missing heading reads as "not applicable", while "Not
recorded." correctly reads as "nobody knows".
