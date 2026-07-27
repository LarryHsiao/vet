# Vet as a handoff-integrity tool

**Date:** 2026-07-27
**Status:** approved, not yet implemented
**Supersedes:** the walking-skeleton check list shipped in `147edaa`

## Why this exists

Vet shipped with three checks — keyboard accessibility, loading/error states, and
fake data. They were chosen on the assumption that the handoff receiver was an
engineer reading code, and that Vet's job was to raise the code's quality before
they saw it.

The receiver is not an engineer reading code. It is **the engineer's AI**. That
single change invalidates most of the original list, because it changes the test
a check must pass.

**The test: can the receiving AI recover this on its own?**

- A missing loading state? Fixed in seconds, unprompted. Not Vet's business.
- An accessibility violation? Mechanically detectable, trivially fixable
  downstream. Not Vet's business.
- A hardcoded array of plausible-looking records? The receiving AI **cannot tell
  it is fake**. It reads it as the intended data shape and builds on top of it.
  This is Vet's business.

Two of the three shipped checks were code-quality checks wearing a handoff
costume. They caught defects the downstream AI would have fixed anyway. Only the
fake-data check survives, and it survives for a reason the original under-stated:
not "fake data is sloppy" but **"fake data actively misleads the receiver."**

## What Vet is now

**A handoff-integrity tool, not a code-quality tool.** It reports only what
**blocks** the next person or **misleads** them. Ordinary polish is the engineer's
AI's job and Vet stays silent about it.

## Grounding: the observed failure modes

Ranked by what actually goes wrong today, per the project owner:

1. **It doesn't actually run.** The handoff starts with the engineer debugging
   someone else's environment. The first hour goes to reaching a working baseline.
2. **Built on something fake.** Stubs, mock endpoints and placeholder handlers get
   treated as the real design. Found late; unwinding costs more than the feature.
3. **Just messy, but predictable.** Real cost, but bounded, and nobody is
   surprised by it.

**Explicitly not a failure mode: intent is lost.** Intent transfers fine today
through tickets and conversation. This retires the fidelity/intent check that
earlier designs treated as central. It is not deferred pending a better idea — it
is cut, because the problem it solves is not occurring.

**Failure mode 3 is deliberately not checked.** If the cost is bounded and nobody
is surprised, a row about it is one a PM cannot usefully act on, and it dilutes
the findings that matter.

## The check list

### Mechanical rows — the project's own tooling

Run only if already configured. Never installed (see *Ask, never install*).

| Row | Resolved from | Why it earns a row |
|---|---|---|
| The code compiles | a `typecheck` or `build` script in `package.json`, else `npx tsc --noEmit` when a `tsconfig.json` exists | Failure mode #1, detected directly |
| The project's tests pass | a `test` script | Only rendered if one exists |
| The project's linter passes | a `lint` script | Mechanically true — no LLM judgment, so no false positives; rules like `exhaustive-deps` and `no-undef` catch real bugs, not only style |

A plain JavaScript project with no TypeScript and no build step has nothing to
resolve for the first row, so that row is not rendered at all. Each row appears
only when its source resolves — never as a "missing" or "skipped" line, which
would read as a chore the person is expected to go and complete.

Lint sits uneasily beside "don't check polish," and that tension is accepted
knowingly: its output costs nothing to obtain, cannot false-positive, and a PM can
paste it back verbatim.

### Dispatched checks — one agent each

**1. Everything it needs is actually here**

Catches the literal fresh-clone breakage:

- a file that is imported but never committed (works locally, missing on clone)
- a package that is imported but absent from `package.json` (resolving through a
  transitive dependency locally, gone on a fresh install)

**This is the load-bearing check.** The mechanical rows above need `node_modules`
present to run at all — so the single case most worth catching, broken or
undeclared dependencies, is exactly the case where the tooling rows go silent.
This check is static and works with nothing installed.

**2. No private keys or config left in the code**

- a committed `.env` — the most likely instance by far, since a PM's assistant
  creates one to make the app run and nothing signals it should not be committed
- hardcoded credentials in source: an API key pasted into a file, a connection
  string carrying a password, a bearer token in a fetch header
- known key shapes: `sk-`, `sk-ant-`, `AKIA…`, `ghp_`, `xox[baprs]-`, `AIza…`,
  PEM `-----BEGIN … PRIVATE KEY-----` blocks
- the mirror case: a required env var with nothing documenting it — the code reads
  `process.env.STRIPE_KEY`, there is no `.env.example`, so the engineer cannot run
  the project and cannot tell what is missing

Under this framing the harm is sharper than "leaked to a repo." The entire premise
of the handoff is that **another AI reads this codebase**. A committed `.env` puts
live credentials into someone else's model context, where their assistant will use
them as the working configuration rather than flagging them.

Two rules this check must carry:

- **Never echo the secret back.** Name the file and the kind of key; quote at most
  the prefix. A report that reprints a credential has copied it somewhere new.
- **The `[FIX]` must say rotate, not merely delete.** Removing a key from a file
  does not un-leak it if it was ever committed — it remains in git history. The
  honest instruction is "revoke this key and issue a new one." This matters
  because "delete the line" looks fixed, produces a green re-run, and leaves a
  live credential in history.

**3. Nothing here is fake**

The survivor, resharpened. Hardcoded data rendered as real, stub handlers
(`onClick={() => {}}`, a checkout that only logs), mock endpoints, placeholder
media hosts, invented metrics, and `// TODO` sitting where the real call belongs.

Framing shift: the failure is not that this is untidy. It is that the receiver
reads it as the intended design.

## What is deliberately unchanged

This is a **content change, not an architecture change**. All of the following
survive untouched:

- the two-channel wire protocol and its per-run token
- the pinned table (fixed status words, byte-identical rows between runs)
- the auto-detected target cascade and its stop-and-ask
- ask-don't-install for dependencies — an offer, never a gate
- the PM-facing voice, `[WHAT]`/`[FIX]`, anti-suppression clauses
- one markdown file per check; project override via `.vet/checks/*.md`

## Known limitation, to be stated rather than hidden

All three dispatched checks assume Node/JS (`package.json`, `.env`). The retired
checks assumed React via file globs, so this is not new — but it is now the *whole*
product rather than part of it.

**Required guard:** when no `package.json` is present, say plainly that Vet only
understands JavaScript projects today. Reporting "Looks fine" on a Python or Go
project is a lie, and a confident false all-clear is the worst output this tool can
produce.

## Migration

- Delete `skills/vet/checks/interactive-elements-accessible.md`
- Delete `skills/vet/checks/loading-and-error-states.md`
- Rewrite `skills/vet/checks/no-fake-data.md` around the misleads-the-receiver
  framing
- Add `skills/vet/checks/everything-needed-is-here.md`
- Add `skills/vet/checks/no-committed-secrets.md`
- Split Step 5's mechanical rows into compile / tests / lint
- Add the no-`package.json` guard to Step 2
- Replace the fixtures under `test/fixtures/broken-ui/` with ones that trip the
  new checks, keeping at least one file that must **not** trip a check, to prove
  discrimination rather than pattern-matching on messiness
- Update `README.md`'s "What it checks today" and `docs/writing-a-check.md`
