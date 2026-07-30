# Vet

You built a feature with an AI coding assistant. Before you hand it to an
engineer, run `/vet`. It reads what changed and tells you, in plain language,
what needs fixing and exactly what to say back to your assistant to fix it.

Vet writes one file, which is its own — `HANDOFF.md`. It never edits your
source, never commits, never pushes, never installs anything, and never sends
your code anywhere beyond the assistant you're already talking to. If running
something would help — installing your project's dependencies so its own lint
and type checks can run, say — it tells you the command and leaves the choice
to you. Skipping it is fine; the report still runs either way. Committing
`HANDOFF.md` afterward is your call, not something Vet does for you.

## Install

```
/plugin marketplace add <this-repo-url-or-local-path>
/plugin install vet@vet-tools
```

## Use

```
/vet
```

Run it in the folder your project lives in. Vet figures out what to check on
its own — files you've changed but haven't saved yet, or the whole project if
nothing has changed recently, or everything if the project isn't tracked in Git
at all. If you're on a line of work that already has some saved commits *and*
unsaved changes on top, Vet will ask you to save those first — commit them the
way you normally would — then run it again so it checks everything together.

Other forms:

```
/vet all                                             # the whole project
/vet recent                                          # just the last saved batch of work
/vet src/components                                  # just one folder
/vet "let people pick a plan and see their team"      # records what you asked for (no check judges fidelity against it yet — see below)
/vet --gated                                         # walk through findings one at a time
```

## What it checks today

Three rows run the project's own tooling, and only appear when their source
resolves — nothing to install, nothing to configure:

- **The code compiles** — the project's own `typecheck` or `build` script, or
  `npx tsc --noEmit` when there's a `tsconfig.json` but no such script, for
  JavaScript/TypeScript; `dart analyze`'s errors for Dart/Flutter; `go build
  ./...` for Go.
- **The project's tests pass** — the project's own `test` script for
  JavaScript/TypeScript; `dart test`/`flutter test` for Dart/Flutter; `go test
  ./...` for Go.
- **The project's linter passes** — the project's own `lint` script for
  JavaScript/TypeScript; `dart analyze`'s warnings/info for Dart/Flutter;
  `golangci-lint run` for Go, when it's configured.

Five more are dispatched, one subagent each, over the files that changed (or
the whole project, depending on what `/vet` decides to check):

- **Everything it needs is actually here** — a file imported but never
  committed, a package imported but missing from the project's manifest
  (`package.json`, `pubspec.yaml`, or `go.mod`): the fresh-clone break your
  own machine can't show you.
- **No private keys or config left in the code** — a committed `.env`, a
  hardcoded credential, or a required environment variable nothing documents.
- **Nothing pretends to be finished** — hardcoded data, stub handlers, or
  placeholder assets left in without saying so. A labelled stub — a comment, a
  name like `SAMPLE_TEAM`, visible "sample data" text — passes on purpose;
  only the unlabelled kind gets flagged.
- **Nothing calls a backend the project doesn't know** — a new call shaped
  like our own API, pointing at a host the project never configured: an
  invented endpoint, or a near-miss typo of the real one. Third-party calls
  (Stripe, Sentry, and the like) are out of scope entirely — only first-party-
  looking calls are judged.
- **New logic lands without a test** — a new function, hook, or component with
  no test anywhere, or a new branch added to an already-tested unit (an error
  path, a guard, a new case) that its siblings are tested but it isn't. Skips
  entirely on a project with no test infrastructure at all. When it fires, the
  fix text also checks whether the project's own `CLAUDE.md`/`AGENTS.md` states
  a "new code needs a test" convention already, and suggests one line to add if
  not.

This is a starting set, not a complete one. See `docs/writing-a-check.md` to add
more.

## HANDOFF.md

Alongside the report, Vet writes `HANDOFF.md` to your project root — the one
file it ever writes. The report is for you, the person who built the feature;
`HANDOFF.md` is for the next reader, an engineer's AI that never saw this
conversation and can't reconstruct from the code alone what's real versus
stubbed, what the project needs to run, what's known-broken, and what you
actually clicked through and tried yourself. It's meant to be committed
alongside the work — tell the engineer's assistant to read it first, before it
reads anything else.

## What it does not do

It checks *how* the feature was built, not *whether it does what you asked for*.
Judging that honestly would require an independent statement of intent, not just
the code — so today `/vet "..."` records what you asked for and drops the "I
didn't check fidelity" footer, but no check yet judges the work against it. It
writes one file, `HANDOFF.md`, and nothing else — it never edits, commits,
pushes, or installs anything on its own; at most it names a command and leaves
the decision to you. And it only understands JavaScript/TypeScript,
Dart/Flutter, and Go projects: with none of `package.json`, `pubspec.yaml`, or
`go.mod` in sight, it says so plainly and stops, rather than handing back a
clean bill of health it has no way to back up.

## For engineers

The table is deterministic — one row per check (mechanical or dispatched), and
the Result cell holds a fixed status word with nothing appended, so the same
code checked twice gives byte-identical rows and a diff of two reports shows
only what actually moved.
The explanations below the table are model-written prose and will vary in
wording between runs.

Each run mints a random token that every check must echo in its verdict line.
This exists so that a check quoting the reply format back at us can't have its
own example parsed as a real verdict — the failure mode being guarded is a
silent `pass` from a check that never ran. A reply missing the token is scored
`Didn't finish`, never rescued.

Checks live as markdown under `skills/vet/checks/`. A project can override the
whole set with `.vet/checks/*.md` in its own root; the override replaces the
built-in checks entirely, it does not merge with them. `.vet/` is also Vet's
own scratch directory — add it to `.gitignore`.

## Adding a check

See `docs/writing-a-check.md`.

## Note

This repo has no root `package.json`, `pubspec.yaml`, or `go.mod`, so it isn't
itself a JavaScript/TypeScript, Dart/Flutter, or Go project — running `/vet`
here trips the project-type guard and refuses, rather than checking anything.
The fixtures under `test/fixtures/` are exercised instead by copying them into
a separate scratch project — see `docs/writing-a-check.md`. The two oldest file-scoped checks and the new-logic-without-a-test check each
have a JS, Dart, and Go fixture pair
(`missing-pieces`/`missing-pieces-dart`/`missing-pieces-go`,
`pretends-finished`/`pretends-finished-dart`/`pretends-finished-go`,
`new-logic-lands-without-a-test`/`new-logic-lands-without-a-test-dart`/`new-logic-lands-without-a-test-go`);
the secrets check has only one (`leaked-secrets/`), since its rule doesn't
branch by language. The backend-host check has a JS and Dart pair only
(`unknown-backend`/`unknown-backend-dart`) — no Go, since it's scoped to
frontend/app code and doesn't apply to a Go backend calling itself.

`docs/superpowers/plans/2026-07-27-handoff-integrity.md` is a fourth,
deliberate trip-point for the secrets check: it quotes the same fake key
shapes inline and is left unredacted on purpose — editing the record to pass
the tool it specifies would be bending verification to fit.

Two more directories under `test/fixtures/` — `test-gap-awareness/` and
`touched-file-coverage/` — aren't check fixtures at all; they serve
`SKILL.md` Step 9's `HANDOFF.md` section, and predate this branch.

## Local development

```
cd vet
claude plugin validate .
/plugin marketplace add ./
/plugin install vet@vet-tools
/reload-plugins
/vet
```

Installed plugins are copied to a cache directory, not run from the source tree.
After editing a check or `SKILL.md`, `/plugin update vet@vet-tools` only
refreshes the cache if `version` in `plugin.json` was bumped — during active
development it's simpler to uninstall and reinstall to force a fresh copy:
`claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools`.
