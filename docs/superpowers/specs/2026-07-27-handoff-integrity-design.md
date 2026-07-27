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

## Form: a skill, not a project rule

Considered and rejected: shipping a rule into the project's `CLAUDE.md` so the
PM's assistant is shaped continuously while building, rather than checked
afterwards.

The argument for it was real — prevention is cheaper than detection, a stub
labelled at creation never becomes a defect, and a rule needs nobody to remember
anything. The argument against won: writing into a project's `CLAUDE.md` is
genuinely invasive. That file may already have contents, may be committed to a
company repo, and may conflict with existing conventions. It is not a free act.

**Accepted consequence, stated rather than hidden:** nothing makes anyone run
Vet. If the PM forgets, it may as well not exist. This is a known, chosen hole,
not an oversight — and it is the first thing to revisit if adoption disappoints.

## Output: a chat report *and* a committed artifact

The report alone evaporates. The PM reads it, fixes things, hands off — and the
receiving AI, the actual audience this whole design is built around, never sees a
word of it. So `/vet` also writes **`HANDOFF.md`** into the project root.

**This changes a core promise and the change must be explicit.** Vet was
"audit only — never edits." It now writes exactly one file: its own handoff
document. It still never edits the person's source, never commits, never pushes,
never installs. The rule becomes: *Vet writes one file, which is its own, and
nothing else.* Committing `HANDOFF.md` remains the person's action, not Vet's.

### What `HANDOFF.md` carries

Everything the receiving AI cannot reconstruct from the code:

- **What this is meant to do** — from the optional intent argument if given
- **What is real, and what is a stub** — from the fake/unlabelled-stub check
- **What is not wired up yet** — handlers that log, endpoints that return fixtures
- **What is known-broken** — failing mechanical rows, verbatim
- **What configuration it needs** — required env vars, from the secrets check
- **What the person actually tried** — see below

### The one thing Vet must ask

**What the PM actually exercised exists nowhere in the code.** Vet cannot detect
it, and the receiving AI badly needs it — "I clicked through the pricing page and
it worked; I never opened the team screen" is worth more than any static finding.

So this is the single question Vet asks the person. Everything else stays
auto-detected. If they decline to answer, the section says plainly that nothing
was recorded, and never implies verification that did not happen.

### Staleness

A `HANDOFF.md` describing code that has since changed is worse than none — it
misleads the receiver with authority, which is the exact failure this tool
exists to prevent. The file records the commit it was generated against, and a
run that finds the file already present and stale says so and rewrites it.

## What is otherwise unchanged

Beyond the artifact, this is a **content change, not an architecture change**:

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
- Add the `HANDOFF.md` writing step, the single "what did you actually try?"
  question, and the staleness guard
- Add `Write` to the skill's `allowed-tools` for `HANDOFF.md` (already added for
  the large-diff patch path) and restate the audit-only rule as *writes one file,
  its own*
- Update `README.md`'s "What it checks today", its "never edits anything" claim,
  and `docs/writing-a-check.md`

## Open gaps, carried knowingly

Recorded so they are not rediscovered as surprises:

1. **Nothing triggers Vet.** Accepted with the skill-only decision above.
2. **The "everything it needs is here" check needs a non-git path.** It compares
   imports against committed files — but the most likely first user never ran
   `git init`. Without a disk-based fallback the load-bearing check silently
   finds nothing in exactly that case.
3. **Secrets already in git history.** The secrets check inspects the working
   tree, so a `.env` that was committed and later deleted reports clean while a
   live credential sits in history. Costs one `git log --diff-filter=A` over
   `.env`-shaped paths.
4. **Nothing verifies a fix landed.** An assistant asked to "make this pass"
   reaches for the suppression first. Anti-suppression clauses help; nothing
   confirms the specific finding was genuinely resolved rather than silenced.
