# Extending Vet to Dart/Flutter and Go

**Date:** 2026-07-28
**Status:** approved, not yet implemented
**Builds on:** `2026-07-27-handoff-integrity-design.md`, which scoped Vet down
to JS/TS and stated the JS-only guard as a known limitation to revisit.

## Why this exists

Vet's project-type guard (`SKILL.md` Step 2) refuses to run on anything
without a `package.json`. That guard exists to avoid a confident false
all-clear on a project Vet cannot actually read — the right call at the time,
since every check was written in JS terms. It is also the reason a Flutter
app or a Go service gets nothing from Vet today, not because the underlying
defects (fresh-clone breakage, leaked secrets, stub data presented as
finished) don't apply to those ecosystems, but because nothing in Vet knows
how to look for them there.

This spec widens Vet to Dart/Flutter and Go, alongside JS/TS rather than in
place of it. The three defect classes Vet checks for are not JS-specific in
concept — a Flutter widget can hardcode its data exactly as a React component
can, and a Go handler can return a literal struct instead of querying a
database exactly as an Express route can. What's JS-specific is the current
wording of the checks and the commands Step 5 shells out to.

## What changes

### 1. The project-type guard (Step 2)

Widens from a single `package.json` check to three, same exclusion rule as
today (skip `test/fixtures/` — planted material, not evidence of the
project's own type):

| Manifest found | Ecosystem |
|---|---|
| `package.json` | JS/TS (existing, unchanged) |
| `pubspec.yaml` | Dart/Flutter |
| `go.mod` | Go |

None found → refusal, wording widened: *"Vet only understands
JavaScript/TypeScript, Dart/Flutter, and Go projects at the moment, and this
one doesn't look like any of those — so I haven't checked it. I'd rather
tell you that than give you a clean bill of health I can't back up."* Same
rule as before: never render a report in this case.

**Dart vs. Flutter.** A `pubspec.yaml` alone doesn't say which CLI to use —
`dart` and `flutter` diverge on `analyze`/`test` invocation. Read the
manifest: a `flutter:` entry under `dependencies:` (the `sdk: flutter` form)
or a top-level `flutter:` section signals Flutter → use the `flutter` CLI.
Neither present → plain Dart package → use the `dart` CLI. This decision only
affects which binary Step 5 invokes; the dispatched checks treat `.dart`
files identically either way.

**Multi-manifest repos.** If more than one manifest *type* is found in the
same scan (e.g. `pubspec.yaml` under `mobile/` and `go.mod` under `server/`
in one monorepo), stop before checking anything and call `AskUserQuestion`,
offering each manifest's containing folder as a candidate target — the same
pattern Step 2's whole-project size gate already uses for "over 400 files."
Whichever folder is chosen becomes an explicit path target, identical to the
person typing `/vet mobile` themselves. This does not touch the existing
handling of multiple manifests of the *same* type (a JS monorepo with several
`package.json` files) — that's unrelated, pre-existing behavior.

### 2. Step 5's mechanical rows

Same three rows — compile, tests, lint — resolved from each ecosystem's own
idioms instead of `package.json` scripts. Still: never installed, never a
failure when tooling is merely absent, never rendered when its source
doesn't resolve at all.

| Row | JS/TS (unchanged) | Dart/Flutter | Go |
|---|---|---|---|
| The code compiles | `typecheck`/`build` script, else `npx tsc --noEmit` | `dart analyze` / `flutter analyze` — **error-severity** results only | `go build ./...` |
| The project's tests pass | `test` script | `dart test` / `flutter test` | `go test ./...` |
| The project's linter passes | `lint` script | same `analyze` run — **warning/info-severity** results only | `golangci-lint run`, only if `.golangci.yml`/`.golangci.yaml` exists or the binary resolves on `PATH`; row absent otherwise |

**The Dart split is the one subtlety here.** `dart`/`flutter analyze` reports
compile errors and lint warnings from a single run — there's no separate
lint command the way ESLint sits apart from `tsc`. Run it once; errors
populate the compile row, warnings/info populate the lint row. Two rows, one
underlying command.

**Go's lint row is conditional in a way the others aren't.** `go vet` ships
with the toolchain and always resolves, but it overlaps heavily with what
`go build` already catches and isn't what a Go developer means by "lint."
`golangci-lint` is the real convention but isn't guaranteed installed, so its
row follows the same "don't render what doesn't resolve" rule already applied
to a JS project with no `lint` script — silence, not a "skipped" line.

**"Couldn't run" wording**, same pattern as the existing JS row (never a
failure, always names the fix command):

- Dart/Flutter deps not fetched → "Run `dart pub get`" or "`flutter pub
  get`" (whichever CLI applies)
- Go deps unreachable → "Run `go mod download`"
- The ecosystem's own toolchain absent entirely → same treatment, naming the
  missing binary

### 3. The dispatched checks

`applies_to` on `everything-needed-is-here.md` and
`nothing-pretends-to-be-finished.md` widens to add `**/*.dart` and
`**/*.go`. `no-committed-secrets.md` carries no `applies_to` (it already
fires on any file) but gains `.dart_tool/` in its exclusion list alongside
the existing `node_modules/`, `vendor/`, etc.

Widening the glob is necessary but not sufficient — both files' `Pass
when`/`Fail when`/`Do not flag` sections are written in JS-specific terms
(`package.json`, `node_modules`, `import`/`require`, React's `onClick`).
Each becomes three per-ecosystem subsections under the same `Pass
when`/`Fail when`/`Do not flag` headings, rather than one section straining
to cover three languages at once:

**`everything-needed-is-here`**

- *Dart/Flutter:* resolve `import 'package:x/x.dart'` against `pubspec.yaml`
  dependencies; resolve relative `import '../foo.dart'` against files on
  disk/git, same fresh-clone logic as the JS version.
- *Go:* resolve import paths against `go.mod` `require` entries, or against
  the module's own declared path for internal packages. Go has no relative
  imports, so the "exists on disk but untracked" failure mode collapses to
  "the imported package directory exists but isn't tracked by git."

**`nothing-pretends-to-be-finished`**

The underlying concept — stub data or unwired controls presented as
finished — holds in both ecosystems; only the concrete shape changes:

- *Dart/Flutter:* `onPressed: () {}`, a hardcoded `List<Widget>` rendered
  with no fetch/provider/bloc behind it, a `TODO` sitting where a real API
  call belongs — the direct Flutter analogues of the existing React
  examples.
- *Go:* a handler (`http.HandlerFunc` or equivalent) that returns a literal
  JSON/struct value with no database or service call behind it; a function
  that returns a hardcoded slice where a real query belongs. Written in
  backend terms rather than forced through UI-flavored language that doesn't
  fit a Go service.

`no-committed-secrets.md`'s body needs no ecosystem-specific rewrite — the
concept and its "never echo a secret back" / "rotate, not delete" rules are
already language-agnostic. Only the exclusion-directory list changes.

### 4. Permissions

`SKILL.md`'s `allowed-tools` gains the Bash prefixes Step 5 now shells out
to: `dart analyze*`, `flutter analyze*`, `dart test*`, `flutter test*`, `go
build*`, `go test*`, `golangci-lint run*`, and a narrow existence check for
the lint binary, `command -v golangci-lint*`.

### 5. Test fixtures

New folders under `test/fixtures/`, one Dart/Flutter and one Go variant per
applicable existing fixture:

- `test/fixtures/missing-pieces-dart/`, `test/fixtures/missing-pieces-go/`
- `test/fixtures/pretends-finished-dart/`, `test/fixtures/pretends-finished-go/`

`leaked-secrets/` stays as-is with no new variant — the check body doesn't
branch by language, so a single fixture already exercises it regardless of
which ecosystem's guard let the run through. The README's fixture list gets
a line explaining this so it doesn't read as an oversight.

## What is unchanged

This is a content and detection-logic change, not an architecture change:

- the two-channel wire protocol and its per-run token
- the pinned table (fixed status words, byte-identical rows between runs)
- the auto-detected target cascade and its stop-and-ask
- ask-don't-install for dependencies — an offer, never a gate
- the PM-facing voice, `[WHAT]`/`[FIX]`, anti-suppression clauses
- one markdown file per check; project override via `.vet/checks/*.md`
- `HANDOFF.md`'s shape and the one question Vet asks

## Migration

- Widen Step 2's guard to detect `pubspec.yaml` and `go.mod`, add the
  Flutter-vs-Dart CLI decision, add the multi-manifest `AskUserQuestion`
- Split Step 5's mechanical-row sourcing per ecosystem, including the
  single-`analyze`-run severity split for Dart/Flutter and the
  binary/config-gated `golangci-lint` row for Go
- Widen `everything-needed-is-here.md` and `nothing-pretends-to-be-finished.md`
  — `applies_to` plus per-ecosystem `Pass when`/`Fail when`/`Do not flag`
  subsections
- Add `.dart_tool/` to `no-committed-secrets.md`'s exclusion list
- Add the new Bash prefixes to `SKILL.md`'s `allowed-tools`
- Add the four new fixture folders; note in the README why `leaked-secrets/`
  has no per-language variant
- Update `README.md`'s "What it checks today" / "For engineers" language
  that currently states JS/TS as the sole supported ecosystem

## Open gaps, carried knowingly

1. **No fixture variant for the secrets check.** Accepted above — the check
   doesn't branch by language, so this is a deliberate omission, not a
   missed one.
2. **`golangci-lint`'s config detection is shallow.** Presence of
   `.golangci.yml`/`.golangci.yaml` or the binary on `PATH` is treated as
   "configured." A project that relies on a fully default `golangci-lint`
   run with neither a config file nor the binary pre-installed gets no lint
   row, same as a JS project with no `lint` script — consistent with the
   existing "never install" rule, but worth naming so it isn't rediscovered
   as a bug.
3. **Flutter/Dart's `analyze` severity split assumes standard severity
   labels** (`error` vs `warning`/`info`) in its output. A project with a
   heavily customized `analysis_options.yaml` that reclassifies severities
   could shift what lands in which row; this is not expected to be common
   enough to special-case now.
4. **Other ecosystems (Python, Rust, Java, …) remain unsupported.** This
   spec widens the guard to three ecosystems, not to "all of them." The
   guard's refusal message names exactly what's supported so the gap stays
   visible rather than implied.
