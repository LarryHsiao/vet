# Report format — worked examples

This file is the rendering reference for `SKILL.md` Step 8. It exists so the
report's *voice* can be tuned without touching dispatch logic.

## Wire spec (recap)

```
<N>|<pass|fail|n/a>|<short note>
===VET-DETAIL-<N>===
[WHAT]
...
[FIX]
...
===END-VET-DETAIL-<N>===
```

The detail block is emitted only on `fail`, is optional from the parser's point
of view (a missing or malformed block degrades the row, never drops it), and is
never rewritten — only reflowed and capped.

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

The wire protocol stays `pass`/`fail`/`n/a` regardless of presentation — a
future voice change (terser, for an engineer audience) only touches this table,
never the check files or the dispatch contract.
