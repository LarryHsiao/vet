# Vet

You built a feature with an AI coding assistant. Before you hand it to an
engineer, run `/vet`. It reads what changed and tells you, in plain language,
what needs fixing and exactly what to say back to your assistant to fix it.

Vet never edits your files, never commits, never installs anything, and never
sends your code anywhere beyond the assistant you're already talking to. If
running something would help — installing your project's dependencies so its
own lint and type checks can run, say — it tells you the command and leaves the
choice to you. Skipping it is fine; the report still runs either way.

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
unsaved changes on top, Vet will ask you to commit or clear those out first,
rather than guess and check only part of it.

Other forms:

```
/vet all                                             # the whole project
/vet recent                                          # just the last saved batch of work
/vet src/components                                  # just one folder
/vet "let people pick a plan and see their team"      # records what you asked for (no check judges fidelity against it yet — see below)
/vet --gated                                         # walk through findings one at a time
```

## What it checks today

- **Buttons and links work with a keyboard** — things that look clickable but
  aren't reachable without a mouse.
- **Screens handle waiting and failure** — a screen that goes blank forever
  when data is loading or a request fails.
- **Nothing on screen is fake data** — invented numbers, placeholder lists, and
  buttons wired to nothing, left in by mistake.

This is a starting set, not a complete one. See `docs/writing-a-check.md` to add
more.

## What it does not do

It checks *how* the feature was built, not *whether it does what you asked for*.
Judging that honestly would require an independent statement of intent, not just
the code — so today `/vet "..."` records what you asked for and drops the "I
didn't check fidelity" footer, but no check yet judges the work against it. It
never edits, commits, or installs anything on its own — at most it names a
command and leaves the decision to you.

## For engineers

The table is deterministic — one row per check file, and the Result cell holds
a fixed status word with nothing appended, so the same code checked twice gives
byte-identical rows and a diff of two reports shows only what actually moved.
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

Running `/vet all` inside this repo will flag `test/fixtures/broken-ui/`. That's
intentional — those files are broken on purpose, as the fastest available smoke
test for the tool itself.

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
