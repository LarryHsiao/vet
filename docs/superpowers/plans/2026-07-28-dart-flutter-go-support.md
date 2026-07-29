# Dart/Flutter and Go Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widen Vet's project-type guard, mechanical checks, and two of its three dispatched checks to cover Dart/Flutter and Go projects, alongside JS/TS rather than in place of it.

**Architecture:** Vet is a Claude Code plugin made entirely of markdown and JSON — no compiled code, no runtime. `skills/vet/SKILL.md` is the procedure; each file in `skills/vet/checks/` is one check dispatched to one subagent in parallel. This plan widens Step 2's guard to detect three manifest types instead of one, splits Step 5's mechanical rows per ecosystem, and rewrites two check files to carry per-language sections. The dispatch machinery (run tokens, pinned table, target cascade) is untouched.

**Tech Stack:** Markdown skill files, JSON plugin manifest, `git`, the `claude` CLI for verification, plus `go`, `dart`, and `flutter` toolchains for the new scratch-project verifications.

**Spec:** `docs/superpowers/specs/2026-07-28-dart-flutter-go-support-design.md`

## Global Constraints

Copied verbatim from the spec — every task's requirements implicitly include these.

- The project-type guard checks for `package.json`, `pubspec.yaml`, or `go.mod` anywhere in the project, excluding `test/fixtures/`. None found → refuse plainly, naming all three ecosystems, never render a report.
- More than one manifest **type** found in the same scan → stop before checking anything, call `AskUserQuestion` once offering each manifest's containing folder as a candidate — no "check everything anyway" option, since each ecosystem needs its own tool commands. Proceed only with the chosen folder as an explicit path target.
- **Never install anything to make a mechanical row work.** A row whose source resolves but can't actually run (deps not fetched, toolchain absent) renders `Couldn't run`, never a failure, and names the exact fix command — an offer, never a gate, never nagged.
- **A row whose source doesn't resolve at all is not rendered** — not even as "skipped." This now includes Go's lint row when `golangci-lint` isn't configured or installed.
- Dart/Flutter's `analyze` runs **once**; its error-severity results populate `The code compiles`, its warning/info-severity results populate `The project's linter passes`. Never two `analyze` invocations for one run.
- `Do not flag` stays the longest section of every check, per language, per the project's existing check-writing convention.
- Every `[FIX]` that could be silenced must say so explicitly — no suppression, no deleted test, regardless of language.
- **Result cells hold exactly one fixed status word**, nothing appended. Two runs over identical code must produce byte-identical table rows.
- Vet still never installs, edits source, commits, or pushes — only `HANDOFF.md` and `.vet/` scratch, unchanged by this plan.

## Testing Reality — read before starting

**There is no unit-test harness.** Vet is markdown; its behaviour only exists when a model executes it. Every task's verification is a **live run**:

```bash
# refresh the installed copy (plugin cache is a snapshot, and
# `plugin update` only acts on a version bump)
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools

# run it
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *) <ecosystem-specific Bash prefixes>" \
  -p "Use the vet skill (from the vet plugin) to check <target>. Follow its SKILL.md exactly. Output only the report."
```

Each run takes 1–3 minutes and consumes account quota. This plan needs scratch projects for **three** ecosystems, not one, so Task 1 alone needs several runs — that is a legitimate cost of full three-ecosystem parity, not a sizing mistake to fix by skipping a language.

**Toolchains confirmed on the machine this plan was written for:** `go` 1.26.3, `dart`/`flutter` (fvm-managed) 3.10.7/3.38.7. **`golangci-lint` is confirmed absent** — leave it that way. Task 1's "lint row doesn't render" verification needs exactly that state to prove honestly; if a future environment happens to have it installed, that step's expected result changes to a rendered lint row instead, and the task should say so rather than force the absence.

**Every check still needs both controls** — a fixture that trips it and one that must not, per language. A check that fires on both is pattern-matching on messiness, not applying its rule.

### Known traps (two carried from the prior plan, two new)

1. **`.gitignore` blocks `.env` fixtures.** Unrelated to this plan, but still true — not touched here.
2. **A fixture `package.json` must stay nested under `test/fixtures/`.** Mechanical rows resolve from the project root only.
3. **The same applies to a fixture `go.mod` or `pubspec.yaml`.** Step 2's guard excludes `test/fixtures/` explicitly, so nesting them there is safe — but never add one at the repo root, or this repo itself starts reporting as a Go or Dart project.
4. **`dart test`/`flutter test` need a real `pub get`, unlike the JS scratch project's `echo`-only test scripts.** Dart has no shortcut equivalent — `dart test` genuinely depends on the `test` package being resolved. Run `pub get` once per Dart/Flutter scratch project as setup; Vet itself never runs it, only the person preparing the scratch project does, same as `npm install` was never run by Vet in the JS scratch project either.

---

### Task 1: Widen the project-type guard and split Step 5's mechanical rows

Guard detection and mechanical-row resolution are two ends of the same data — `PROJECT_ECOSYSTEM` (and, for Dart, `DART_CLI`) is only observable once Step 5 consumes it, so a reviewer can't meaningfully approve one half without the other. One task, per the same shape as the prior plan's "split mechanical rows and guard non-JS projects" task.

**Files:**
- Modify: `skills/vet/SKILL.md` — frontmatter `allowed-tools` (lines 6–19), Step 2's project-type guard (lines 48–57), Step 5's body (lines 168–211)
- Modify: `skills/vet/checks/no-committed-secrets.md` — exclusion list (line 79)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the three mechanical row labels (`The code compiles`, `The project's tests pass`, `The project's linter passes`) now resolve from `PROJECT_ECOSYSTEM`-specific sources. Tasks 2 and 3 don't depend on this — their `applies_to` globs fire independently of which ecosystem Step 2 detected.

- [ ] **Step 1: Replace the `allowed-tools` frontmatter**

Replace lines 6–19 of `skills/vet/SKILL.md` with:

```yaml
allowed-tools:
  - Read
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - Write
  - Bash(git *)
  - Bash(ls *)
  - Bash(wc *)
  - Bash(npm run lint*)
  - Bash(npm run typecheck*)
  - Bash(npm run build*)
  - Bash(npm run test*)
  - Bash(npx tsc --noEmit*)
  - Bash(dart analyze*)
  - Bash(flutter analyze*)
  - Bash(dart test*)
  - Bash(flutter test*)
  - Bash(go build*)
  - Bash(go test*)
  - Bash(golangci-lint run*)
  - Bash(command -v golangci-lint*)
```

- [ ] **Step 2: Replace the project-type guard**

Replace lines 48–57 of `skills/vet/SKILL.md` (the blockquote starting `> **Project-type guard.**`) with:

```markdown
> **Project-type guard.** Check first for a `package.json`, `pubspec.yaml`, or
> `go.mod` anywhere in the project, excluding test/fixture directories (e.g.
> `test/fixtures/`) — those hold deliberately-planted material for the
> dispatched checks to find, not evidence that the project itself belongs to
> that ecosystem.
>
> **More than one manifest type found** (e.g. a `pubspec.yaml` under `mobile/`
> and a `go.mod` under `server/` in the same tree) → stop before checking
> anything. Call `AskUserQuestion` once, offering each manifest's containing
> folder as a candidate target — no "check everything anyway" option here,
> unlike the whole-project size gate below, because each ecosystem needs its
> own tool commands and there is no sensible combined check. Proceed with
> whichever folder is chosen, as an explicit path target — same as if the
> person had typed `/vet <folder>` themselves.
>
> **Exactly one manifest type found** fixes `PROJECT_ECOSYSTEM` for the rest of
> this run: `js` for `package.json`, `dart` for `pubspec.yaml`, `go` for
> `go.mod`. When it is `dart`, also read the `pubspec.yaml`: a `flutter:` entry
> under `dependencies:` (the `sdk: flutter` form) or a top-level `flutter:`
> section fixes `DART_CLI` to `flutter`; neither present fixes it to `dart`.
> This decision only affects which CLI Step 5 shells out to — it does not
> change which files the dispatched checks look at.
>
> **None found** → Vet cannot check this project. Say so plainly and stop:
> "Vet only understands JavaScript/TypeScript, Dart/Flutter, and Go projects at
> the moment, and this one doesn't look like any of those — so I haven't
> checked it. I'd rather tell you that than give you a clean bill of health I
> can't back up." Never render a report. A confident all-clear on a project Vet
> cannot read is the worst output it can produce.
```

- [ ] **Step 3: Replace Step 5's body**

Replace lines 168–211 of `skills/vet/SKILL.md` (from `## Step 5 — Run the project's own checks (optional leading rows)` through the end of its lint-retention note, up to but not including `## Step 6 — Dispatch`) with:

```markdown
## Step 5 — Run the project's own checks (optional leading rows)

Only if already configured — never install anything to make one work. Compile,
tests, and lint are different things, not one undifferentiated block: each of
the three rows below resolves independently from its own source, per
`PROJECT_ECOSYSTEM` (fixed in Step 2), and renders **only** when that source
resolves.

**`PROJECT_ECOSYSTEM` is `js`** — unchanged:

- **`The code compiles`** resolves from a `typecheck` or `build` script in
  `package.json`; failing that, from `npx tsc --noEmit` when a `tsconfig.json`
  exists.
- **`The project's tests pass`** resolves from a `test` script in
  `package.json`.
- **`The project's linter passes`** resolves from a `lint` script in
  `package.json`.

**`PROJECT_ECOSYSTEM` is `dart`** — run `<DART_CLI> analyze` once (`DART_CLI`
fixed in Step 2) and split its output by severity. Never run `analyze` twice:

- **`The code compiles`** resolves from that one run's **error**-severity
  results.
- **`The project's tests pass`** resolves from `<DART_CLI> test`.
- **`The project's linter passes`** resolves from that same run's
  **warning/info**-severity results — not a second command.

**`PROJECT_ECOSYSTEM` is `go`**:

- **`The code compiles`** resolves from `go build ./...`.
- **`The project's tests pass`** resolves from `go test ./...`.
- **`The project's linter passes`** resolves from `golangci-lint run`, only
  when `command -v golangci-lint` resolves or a `.golangci.yml`/
  `.golangci.yaml` exists at the project root; the row is absent otherwise —
  the same "don't render what doesn't resolve" rule as a JS project with no
  `lint` script.

A row whose source doesn't resolve at all is not rendered — not even as
"skipped." There is nothing to install and nothing to fix for that row, and a
"skipped" row would read as a chore the person is expected to go and complete.

When a row's source *does* resolve but the command still can't actually
run — dependencies aren't fetched, or the toolchain itself isn't found — the
row is **never a failure**; missing tooling is not a defect in the feature.
Render that row as **"Couldn't run"** and say why, naming the exact command to
fix it: `npm install` (`js`), `dart pub get` or `flutter pub get` matching
`DART_CLI` (`dart`), or `go mod download` (`go`). Adapt the sentence to name
the row in question (tests, lint, or the type/build check).

**This is an offer, never a gate.** Everything else proceeds exactly as
normal: all the dispatched checks still run, and the full report still
renders. Declining to install is a legitimate choice, not a problem to solve —
if the person runs `/vet` again without installing, state the same line once
more, plainly, and carry on. Never nag, never escalate the wording, never
withhold the report, and never ask them to confirm the choice.

These render as leading rows, above the dispatched checks, each labelled with
its own name — no longer grouped under one shared heading.

> `The code compiles` is the direct detection of the top failure mode. Lint is
> retained knowingly despite polish being out of scope: its output is
> mechanically true, cannot false-positive, and rules such as `exhaustive-deps`
> and `no-undef` (or their Dart/Go analogues) catch real defects rather than
> style. If it proves noisy in practice, this is the paragraph to revisit.
```

- [ ] **Step 4: Add `.dart_tool/` to the secrets check's exclusion list**

In `skills/vet/checks/no-committed-secrets.md`, replace line 79:

```markdown
- Anything under `node_modules/`, `dist/`, `build/`, `.next/`, `coverage/`,
  `vendor/`, or a lockfile.
```

with:

```markdown
- Anything under `node_modules/`, `dist/`, `build/`, `.next/`, `coverage/`,
  `vendor/`, `.dart_tool/`, or a lockfile.
```

- [ ] **Step 5: Verify the refusal path — no setup needed**

This repo has no `package.json`, `pubspec.yaml`, or `go.mod` at its root, so it still exercises the "none found" branch after this change:

```bash
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly."
```

**Expected:** no table at all, and the refusal message now names all three ecosystems ("JavaScript/TypeScript, Dart/Flutter, and Go").

- [ ] **Step 6: Verify the multi-manifest ask — manual check**

This branch can't be driven fully non-interactively (`claude -p` has no way to answer an `AskUserQuestion` prompt), so this step is a manual/interactive check rather than a scripted one:

```bash
mkdir -p ~/vet-scratch-multi/mobile ~/vet-scratch-multi/server
cd ~/vet-scratch-multi && git init -q
printf 'name: mobile_app\nenvironment:\n  sdk: ^3.0.0\n' > mobile/pubspec.yaml
printf 'module server\n\ngo 1.22\n' > server/go.mod
git add -A && git commit -q -m "scratch"
```

Open an interactive Claude Code session rooted at `~/vet-scratch-multi` and run `/vet all`. **Expected:** Vet stops before checking anything and asks which folder to check, offering `mobile/` and `server/` — not a combined "check everything" option. Pick either folder and confirm the run proceeds using that folder as an explicit target.

- [ ] **Step 7: Verify the Go path — build, test, and the absent-lint-row rule**

```bash
mkdir -p ~/vet-scratch-go && cd ~/vet-scratch-go && git init -q
cat > go.mod <<'EOF'
module vetscratch

go 1.22
EOF
cat > main.go <<'EOF'
package main

import "fmt"

func Add(a, b int) int {
	return a + b
}

func main() {
	fmt.Println(Add(2, 3))
}
EOF
cat > main_test.go <<'EOF'
package main

import "testing"

func TestAdd(t *testing.T) {
	got := Add(2, 3)
	want := 6 // deliberately wrong, to prove a failing test renders "Fix this"
	if got != want {
		t.Errorf("Add(2, 3) = %d, want %d", got, want)
	}
}
EOF
git add -A && git commit -q -m "scratch"
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *) Bash(go *) Bash(command -v *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected:** `The code compiles` → `Looks fine`. `The project's tests pass` → `Fix this`, naming the `TestAdd` mismatch. `The project's linter passes` does **not** appear at all — `golangci-lint` isn't installed and no `.golangci.yml` exists.

- [ ] **Step 8: Verify the Dart path — the single-`analyze`-run severity split, and tests**

```bash
mkdir -p ~/vet-scratch-dart/lib ~/vet-scratch-dart/test && cd ~/vet-scratch-dart && git init -q
cat > pubspec.yaml <<'EOF'
name: vet_scratch
description: scratch project for Vet's Dart verification
publish_to: 'none'
version: 0.0.1

environment:
  sdk: ^3.0.0

dev_dependencies:
  test: ^1.24.0
EOF
cat > lib/greeting.dart <<'EOF'
import 'dart:convert'; // unused import -> info-severity diagnostic

int add(int a, int b) {
  String bad = a + b; // type error -> error-severity diagnostic
  return bad.length;
}
EOF
cat > lib/math_utils.dart <<'EOF'
int add(int a, int b) => a + b;
EOF
cat > test/math_utils_test.dart <<'EOF'
import 'package:test/test.dart';
import '../lib/math_utils.dart';

void main() {
  test('adds two numbers', () {
    final result = add(2, 3);
    expect(result, 5);
  });
}
EOF
dart pub get
git add -A && git commit -q -m "scratch"
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *) Bash(dart *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected:** `The code compiles` → `Fix this`, naming `lib/greeting.dart`'s type error. `The project's linter passes` → `Fix this`, naming the unused `dart:convert` import — from the **same** `dart analyze` run, not a second command. `The project's tests pass` → `Looks fine`.

- [ ] **Step 9: Verify Flutter-vs-Dart CLI selection**

```bash
mkdir -p ~/vet-scratch-flutter/lib && cd ~/vet-scratch-flutter && git init -q
cat > pubspec.yaml <<'EOF'
name: vet_scratch_flutter
description: scratch project for Vet's Flutter-CLI-selection verification
publish_to: 'none'
version: 0.0.1

environment:
  sdk: ^3.0.0

dependencies:
  flutter:
    sdk: flutter
EOF
cat > lib/greeting.dart <<'EOF'
import 'dart:convert'; // unused import -> info-severity diagnostic

int add(int a, int b) {
  String bad = a + b; // type error -> error-severity diagnostic
  return bad.length;
}
EOF
flutter pub get
git add -A && git commit -q -m "scratch"
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *) Bash(flutter *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected:** same split as Step 8 (`The code compiles` fails on the type error, `The project's linter passes` fails on the unused import), proving Step 2 correctly read the `flutter:` dependency and Step 5 shelled out to `flutter analyze` rather than `dart analyze`.

- [ ] **Step 10: Commit**

```bash
cd ~/vet
git add -A
git commit -m "Widen the project-type guard to Dart/Flutter and Go

Step 2's guard checked only for package.json. It now also detects
pubspec.yaml and go.mod, fixing PROJECT_ECOSYSTEM (and, for Dart,
DART_CLI -- flutter vs plain dart, read from the flutter: dependency)
for the rest of the run. More than one manifest type in the same tree
stops the run and asks which folder to check, since each ecosystem
needs its own tool commands.

Step 5's three mechanical rows now resolve per ecosystem: Dart/Flutter
runs analyze once and splits its output by severity into the compile
and lint rows rather than invoking it twice; Go's lint row is gated on
golangci-lint actually resolving, same as a JS project with no lint
script. Adds the Bash permissions Step 5 now shells out to, and folds
.dart_tool/ into the secrets check's exclusion list alongside the
existing node_modules/ and vendor/."
```

---

### Task 2: Widen "Everything it needs is actually here" to Dart and Go

**Files:**
- Modify: `skills/vet/checks/everything-needed-is-here.md` — full rewrite
- Create: `test/fixtures/missing-pieces-dart/pubspec.yaml`
- Create: `test/fixtures/missing-pieces-dart/lib/main.dart`
- Create: `test/fixtures/missing-pieces-dart/lib/widgets/footer.dart`
- Create: `test/fixtures/missing-pieces-dart/README.md`
- Create: `test/fixtures/missing-pieces-go/go.mod`
- Create: `test/fixtures/missing-pieces-go/main.go`
- Create: `test/fixtures/missing-pieces-go/internal/greeting/greeting.go`
- Create: `test/fixtures/missing-pieces-go/README.md`

**Interfaces:**
- Consumes: nothing from Task 1 — `applies_to` glob matching in Step 4 is independent of `PROJECT_ECOSYSTEM`.
- Produces: nothing consumed by other tasks — the check's display name (`Everything it needs is actually here`) is unchanged from today.

- [ ] **Step 1: Write the Dart fixtures**

`test/fixtures/missing-pieces-dart/pubspec.yaml` — declares only `http`, while the code imports `dio` too:

```yaml
name: missing_pieces_fixture
description: Deliberately incomplete Dart fixture. Not built or shipped.
publish_to: 'none'
version: 0.0.0

environment:
  sdk: ^3.0.0

dependencies:
  http: ^1.2.0
```

`test/fixtures/missing-pieces-dart/lib/main.dart` — MUST trip: imports an undeclared package *and* a file that does not exist:

```dart
import 'package:dio/dio.dart';
import 'widgets/header.dart';
import 'widgets/footer.dart';

void main() {
  final client = Dio();
  print(buildHeader());
  print(buildFooter());
  print(client);
}
```

`test/fixtures/missing-pieces-dart/lib/widgets/footer.dart` — the negative control: imported and present, so it must NOT be flagged:

```dart
String buildFooter() => 'fixture footer';
```

`test/fixtures/missing-pieces-dart/README.md`:

```markdown
# Fixtures: everything it needs is actually here (Dart)

Deliberately incomplete. Not built, imported, or shipped.

| Import in `lib/main.dart` | Must trip? | Why |
|---|---|---|
| `package:dio/dio.dart` | **Yes** | Imported but `dio` is absent from `pubspec.yaml`'s dependencies — a fresh `pub get` will not have it. |
| `widgets/header.dart` | **Yes** | Imported but the file does not exist. |
| `widgets/footer.dart` | **No** | Imported and present. Flagging it means the check is not resolving relative imports. |

Note `widgets/header.dart` is *absent by design*. Do not create it to "fix" the fixture.
```

- [ ] **Step 2: Write the Go fixtures**

`test/fixtures/missing-pieces-go/go.mod` — declares no external requires at all, while the code imports one:

```
module missingpiecesfixture

go 1.22
```

`test/fixtures/missing-pieces-go/main.go` — MUST trip: imports an undeclared external module *and* an internal package directory that does not exist:

```go
package main

import (
	"fmt"

	"github.com/google/uuid"

	"missingpiecesfixture/internal/greeting"
	"missingpiecesfixture/internal/missing"
)

func main() {
	fmt.Println(greeting.Hello())
	fmt.Println(missing.Placeholder())
	fmt.Println(uuid.New())
}
```

`test/fixtures/missing-pieces-go/internal/greeting/greeting.go` — the negative control: an internal import that resolves, so it must NOT be flagged:

```go
package greeting

func Hello() string {
	return "fixture greeting"
}
```

`test/fixtures/missing-pieces-go/README.md`:

```markdown
# Fixtures: everything it needs is actually here (Go)

Deliberately incomplete. Not built, imported, or shipped.

| Import in `main.go` | Must trip? | Why |
|---|---|---|
| `github.com/google/uuid` | **Yes** | Imported but absent from `go.mod`'s `require` block — a fresh `go mod download` will not have it. |
| `missingpiecesfixture/internal/missing` | **Yes** | An internal import naming a package directory that does not exist. |
| `missingpiecesfixture/internal/greeting` | **No** | Internal, and the directory is present. Flagging it means the check is not resolving internal packages. |

Note `internal/missing/` is *absent by design*. Do not create it to "fix" the fixture.
```

- [ ] **Step 3: Rewrite the check**

Replace the full contents of `skills/vet/checks/everything-needed-is-here.md` with:

````markdown
---
name: Everything it needs is actually here
scope: [changes, project]
applies_to: ["**/*.tsx", "**/*.jsx", "**/*.ts", "**/*.js", "**/*.vue", "**/*.svelte", "**/*.dart", "**/*.go"]
---

Work that runs on the machine it was built on will not necessarily run anywhere
else. A file can be imported but never committed; a package can resolve locally
through some other dependency and vanish on a fresh install. Both are invisible
to the person who built it, because their machine already has what is missing.
The receiving engineer meets it as a broken clone, and the first hour of the
handoff goes to reconstructing an environment rather than doing the work.

Resolve every import in the target and report the ones that would not resolve
for someone starting from a fresh clone. Use the subsection below matching the
file's language — JavaScript/TypeScript, Dart, and Go import resolution are
different problems wearing the same shape.

**Two ways to resolve, and both must be tried in order, for every language
below.** If the project is tracked in git, compare against the files git
knows about, so a file present on disk but never committed is correctly
reported as missing. If the project is **not** tracked in git — which is
common, because the person's assistant scaffolded the project and nobody ran
`git init` — fall back to comparing against the files on disk. Never skip the
check because git is absent; the disk comparison still catches every missing
file and every undeclared package.

## JavaScript/TypeScript

**Pass when**

- Every relative import (`./`, `../`, or an alias such as `@/`) resolves to a
  file that exists — and, when git is present, is tracked by git.
- Every bare package import appears in `dependencies`, `devDependencies`,
  `peerDependencies` or `optionalDependencies` of the nearest `package.json`.
- Alias imports resolve through the aliases actually configured in
  `tsconfig.json` `paths`, `jsconfig.json`, or the bundler config. Read the
  config before deciding an alias is broken.

**Fail when**

- A relative import points at a file that does not exist.
- A relative import points at a file that exists on disk but is untracked, in a
  git project. It works locally and is absent on clone — the hardest instance
  for the person to see and the most costly for the receiver.
- A bare package import is absent from every dependency field.
- A `package.json` is absent entirely while bare imports exist, in a project
  that is plainly Node/JS.

**Do not flag**

- Node built-ins, with or without the prefix: `fs`, `path`, `node:fs`, `crypto`,
  `http`, `url`, `stream`, `util`, `os`, `child_process`, `events`, `buffer`.
- Framework-provided virtual or generated modules that never appear in
  `package.json`: `next/*`, `$app/*` and `$lib/*` (SvelteKit), `astro:*`,
  `virtual:*`, `~icons/*`, `.svelte-kit/*`, `.next/*`.
- Type-only imports of packages present as `@types/*`, and `import type`
  statements resolving to declaration files.
- Bundler-special import suffixes that resolve to no file on disk: `?raw`,
  `?url`, `?worker` — these are query-string directives to the bundler, not
  paths, so there is nothing on disk to check.
- Style and asset imports (`.css`, `.scss`, `.svg`, `.png`, `.jpg`, `.webp`,
  `.json`, and the like) are **not** exempted from the existence check —
  resolve the path like any other and fail it if the file is not there. A
  referenced image or stylesheet that was never committed is a fresh-clone
  break exactly like a missing component or an undeclared package; only the
  bundler-special suffixes above are exempt, not the ordinary asset path.
- Files under `node_modules/`, `.next/`, `dist/`, `build/`, `out/`, `coverage/`,
  `vendor/`, `.venv/`, or any generated output.
- Tests, stories, mocks and fixtures, and anything they import.
- Transitive imports inside third-party code. Only imports written in this
  project's own files are in scope.
- A monorepo workspace package resolving through a root or sibling
  `package.json`, or a `workspace:` protocol dependency. Check the root manifest
  before deciding.
- An import that resolves through an alias you have not read the config for. If
  you cannot confirm the alias is undefined, do not guess.
- More than three instances. Name the three clearest and count the rest.

## Dart/Flutter

**Pass when**

- Every `import 'package:x/x.dart'` resolves to an entry in `pubspec.yaml`'s
  `dependencies` or `dev_dependencies`.
- Every relative import (`import 'foo.dart'`, `import '../foo.dart'`) resolves
  to a file that exists — and, when git is present, is tracked by git.
- A `path:` or `git:` dependency in `pubspec.yaml` resolves against the
  location it declares.

**Fail when**

- A `package:` import names a package absent from every dependency field in
  `pubspec.yaml`.
- A relative import points at a `.dart` file that does not exist.
- A relative import points at a file that exists on disk but is untracked, in
  a git project.
- A `pubspec.yaml` is absent entirely while `package:` imports exist, in a
  project that is plainly Dart or Flutter.

**Do not flag**

- Dart/Flutter SDK core libraries: any `dart:*` import (`dart:core`,
  `dart:async`, `dart:io`, `dart:convert`, `dart:math`, `dart:collection`,
  `dart:typed_data`, and the rest).
- Generated files: `*.g.dart`, `*.freezed.dart`, `*.gr.dart`, and anything
  under `.dart_tool/` or `build/`.
- Tests and anything under `test/`, `test_driver/`, `integration_test/`.
- A `path:` or `git:` dependency you have not checked the referenced location
  for. If you cannot confirm it is missing, do not guess.
- More than three instances. Name the three clearest and count the rest.

## Go

**Pass when**

- Every import path matches an entry in `go.mod`'s `require` block, is a
  standard library package, or begins with the module's own `module`
  declaration (an internal package).
- An internal package's directory exists — and, when git is present, is
  tracked by git.

**Fail when**

- An import path resolves to neither a `go.mod` require entry, the standard
  library, nor the module's own declared path.
- An internal package's directory exists on disk but is untracked, in a git
  project.
- A `go.mod` is absent entirely while non-standard-library imports exist, in a
  project that is plainly Go.

**Do not flag**

- Standard library imports — no fixed list; treat an import with no dot in its
  first path segment as standard library unless it also matches an internal
  package path.
- Files under `vendor/` — a vendored, checked-in copy of a resolved
  dependency.
- Generated files: `*_gen.go`, `*.pb.go`, and anything carrying a `// Code
  generated ... DO NOT EDIT.` header.
- Test files (`_test.go`) and anything under `testdata/`.
- More than three instances. Name the three clearest and count the rest.

## On fail

Name each missing item and its route, matched to the language: commit the
file; for JavaScript/TypeScript add the package with the exact command
(`npm install <pkg>`); for Dart run `dart pub add <pkg>` (or add it to
`pubspec.yaml` directly); for Go run `go get <module>`; or correct the path.
Do not suggest deleting the import to make the error disappear, and do not
suggest a lint suppression — the code needs the thing it is asking for.
````

- [ ] **Step 4: Reinstall and verify live — Dart fixture**

```bash
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
mkdir -p ~/vet-scratch-check2-dart && cd ~/vet-scratch-check2-dart && git init -q
cp -r ~/vet/test/fixtures/missing-pieces-dart/* .
git add -A && git commit -q -m "scratch"
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected:** `Everything it needs is actually here` reads `Fix this`, its `[WHAT]` names both `dio` and `widgets/header.dart`, and does **not** name `widgets/footer.dart`.

- [ ] **Step 5: Verify live — Go fixture**

```bash
mkdir -p ~/vet-scratch-check2-go && cd ~/vet-scratch-check2-go && git init -q
cp -r ~/vet/test/fixtures/missing-pieces-go/* .
git add -A && git commit -q -m "scratch"
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected:** `Everything it needs is actually here` reads `Fix this`, its `[WHAT]` names both `github.com/google/uuid` and `internal/missing`, and does **not** name `internal/greeting`.

- [ ] **Step 6: Commit**

```bash
cd ~/vet
git add -A
git commit -m "Widen everything-needed-is-here to Dart and Go

The concept -- a file imported but never committed, a package imported
but undeclared -- holds in every ecosystem; only what counts as an
import and where dependencies are declared changes. Adds per-language
Pass when / Fail when / Do not flag sections for Dart/Flutter (package:
imports against pubspec.yaml, relative imports against disk/git) and Go
(import paths against go.mod's require block or the module's own
declared path, since Go has no relative imports), alongside the
unchanged JS/TS section.

Adds a fixture pair per new language, each with a positive control that
must trip the check and a negative control that must not."
```

---

### Task 3: Widen "Nothing pretends to be finished" to Dart/Flutter and Go

**Files:**
- Modify: `skills/vet/checks/nothing-pretends-to-be-finished.md` — full rewrite
- Create: `test/fixtures/pretends-finished-dart/lib/pricing_card.dart`
- Create: `test/fixtures/pretends-finished-dart/lib/team_list.dart`
- Create: `test/fixtures/pretends-finished-dart/README.md`
- Create: `test/fixtures/pretends-finished-go/handlers/pricing.go`
- Create: `test/fixtures/pretends-finished-go/handlers/team.go`
- Create: `test/fixtures/pretends-finished-go/README.md`

**Interfaces:**
- Consumes: nothing from Tasks 1–2.
- Produces: nothing consumed by other tasks — the check's display name (`Nothing pretends to be finished`) is unchanged.

- [ ] **Step 1: Write the Dart/Flutter fixtures**

`test/fixtures/pretends-finished-dart/lib/pricing_card.dart` — MUST trip. Unlabelled hardcoded data, an invented metric, a placeholder asset, and a control wired to nothing:

```dart
import 'package:flutter/material.dart';

class PricingCard extends StatefulWidget {
  const PricingCard({super.key});

  @override
  State<PricingCard> createState() => _PricingCardState();
}

class _PricingCardState extends State<PricingCard> {
  String _selected = 'team';

  static const _plans = [
    {'id': 'starter', 'name': 'Starter', 'price': 19, 'saved': '+12% this month'},
    {'id': 'team', 'name': 'Team', 'price': 49, 'saved': '+31% this month'},
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final plan in _plans)
          ListTile(
            title: Text(plan['name'] as String),
            subtitle: Text('\$${plan['price']} — ${plan['saved']}'),
            onTap: () => setState(() => _selected = plan['id'] as String),
          ),
        ElevatedButton(
          onPressed: () {},
          child: const Text('Choose plan'),
        ),
        Image.network('https://via.placeholder.com/64'),
      ],
    );
  }
}
```

`test/fixtures/pretends-finished-dart/lib/team_list.dart` — the negative control. Same stub shape, but labelled, so it must NOT be flagged:

```dart
import 'package:flutter/material.dart';

// STUB: the team API is not built yet. This renders fixed sample rows so the
// page layout can be reviewed. Replace loadTeam() with the real endpoint.
const List<String> sampleTeam = ['Sample Person', 'Another Sample'];

List<String> loadTeam() => sampleTeam;

class TeamList extends StatelessWidget {
  const TeamList({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final name in loadTeam()) Text('$name (sample data)'),
      ],
    );
  }
}
```

`test/fixtures/pretends-finished-dart/README.md`:

```markdown
# Fixtures: nothing pretends to be finished (Dart/Flutter)

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `pricing_card.dart` | **Yes** | Hardcoded plans with an invented "+12% this month", a placeholder image host, and an `onPressed` wired to nothing — none of it labelled. It reads as finished. |
| `team_list.dart` | **No** | The same stub shape, but a `STUB:` comment states what is missing and the UI says "(sample data)". Honest, so it passes. |

**Invariant:** if a run flags `team_list.dart`, the check is pattern-matching
on stub-shaped code rather than applying its rule, and is wrong.
```

- [ ] **Step 2: Write the Go fixtures**

`test/fixtures/pretends-finished-go/handlers/pricing.go` — MUST trip. Hardcoded data returned with no service call behind it, and nothing marks it as sample:

```go
package handlers

import (
	"encoding/json"
	"net/http"
)

type plan struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Saved string `json:"saved"`
}

func Pricing(w http.ResponseWriter, r *http.Request) {
	plans := []plan{
		{ID: "starter", Name: "Starter", Price: 19, Saved: "+12% this month"},
		{ID: "team", Name: "Team", Price: 49, Saved: "+31% this month"},
	}
	json.NewEncoder(w).Encode(plans)
}
```

`test/fixtures/pretends-finished-go/handlers/team.go` — the negative control. An honest "not implemented" stub, so it must NOT be flagged:

```go
package handlers

import "net/http"

// Team is not wired to the real roster service yet.
func Team(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "team endpoint not implemented", http.StatusNotImplemented)
}
```

`test/fixtures/pretends-finished-go/README.md`:

```markdown
# Fixtures: nothing pretends to be finished (Go)

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `handlers/pricing.go` | **Yes** | Returns a hardcoded plan list with an invented "+12% this month" and no database or service call behind it — nothing marks it as sample. It reads as finished. |
| `handlers/team.go` | **No** | Returns an honest `http.StatusNotImplemented` with a comment explaining why. This is the labelled-stub route, not a fake success. |

**Invariant:** if a run flags `handlers/team.go`, the check is treating an
honest "not implemented" response as if it were a hidden fake, and is wrong.
```

- [ ] **Step 3: Rewrite the check**

Replace the full contents of `skills/vet/checks/nothing-pretends-to-be-finished.md` with:

````markdown
---
name: Nothing pretends to be finished
scope: [changes, project]
applies_to: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.ts", "**/*.js", "**/*.dart", "**/*.go"]
---

When an assistant builds a screen it invents the data to fill it, so the screen
renders immediately. That is the right move while building. The problem comes at
handoff, because the next reader is another AI, and it cannot tell invented data
from real data. It reads a hardcoded array as the intended shape and builds on
top of it. The cost is discovered late and unwinding it exceeds the original
feature.

The defect is not that a stub exists. Handing off half-built work is legitimate
and common. The defect is a stub that **presents itself as finished**. A stub
that says what it is costs the receiver nothing; an unlabelled one misleads them.

Inspect the target for anything that would read as working to someone who did
not build it. Use the subsection below matching the file's language.

## JavaScript/TypeScript

**Pass when**

- Values rendered to the user come from a real source: props, state fed by a
  fetch, a query hook, route params, a form, a database call, a CMS.
- Sample data, stub handlers and placeholder assets are **labelled** — a comment
  naming what is missing (`// STUB:`, `// TODO: connect to the real endpoint`),
  a clearly-named symbol (`SAMPLE_TEAM`, `PLACEHOLDER_AVATAR`), or visible UI
  text saying the data is sample. Any one of these is enough.
- Controls do something, or say that they do not.

**Fail when**

- A component defines realistic-looking records and renders them with no fetch
  anywhere in the component or its parents, and nothing marks them as sample.
- A metric, count, badge or percentage is a literal in the render path — a
  `"+12% this month"` that is a string — with no note that it is invented.
- Placeholder media is wired in as if real: `via.placeholder.com`,
  `placehold.co`, `picsum.photos`, `i.pravatar.cc`, `randomuser.me`.
- A control is wired to nothing and does not say so: `onClick={() => {}}`,
  `onClick={() => console.log(...)}`, an `onSubmit` that only `preventDefault()`s.
- A fetch exists but its result is discarded and hardcoded values render anyway —
  the most deceptive variant, because the network tab looks correct.
- A label exists but is false: a comment claiming the endpoint is wired when it
  is not.

**Do not flag**

- Anything carrying an honest label, per *Pass when*. This is the point of the
  check — do not flag a stub for being a stub.
- Files under `node_modules/`, `.next/`, `dist/`, `build/`, `out/`, `coverage/`,
  `vendor/`, or any generated client (`*.generated.*`, `__generated__/`, Prisma
  or Supabase SDKs).
- Vendored design-system code the person did not write: `components/ui/`,
  `components/primitives/`, shadcn/Radix/DaisyUI/Chakra output. Flag the call
  sites they wrote, not the primitive.
- Tests, stories, fixtures and mocks by location or name: `*.test.*`, `*.spec.*`,
  `*.stories.*`, `__tests__/`, `__mocks__/`, `fixtures/`, `mocks/`, `msw/`,
  `seed*`, `prisma/seed.*`, and anything behind a development-only guard
  (`process.env.NODE_ENV !== 'production'`, `import.meta.env.DEV`).
- Genuine static content: navigation menus, footer links, marketing copy, FAQ
  entries, country and currency lists, enum labels, chart axis labels, i18n
  catalogues, theme tokens, route tables, validation messages.
- Empty-state and skeleton placeholder content. A skeleton row is a loading
  state, not fake data.
- Defaults and fallbacks: `?? 0`, `|| []`, a default avatar, a "Guest" name.
- Demo, example, playground, sandbox and marketing routes — `demo/`,
  `examples/`, `playground/`, `(marketing)/`, `docs/`.
- A hardcoded value in a component that also accepts it as an optional prop with
  that value as the default. That is a default, not a fake.
- Pre-existing unlabelled data in files this change merely touched, when the
  scope is `changes`.
- More than three instances. Name the three most visible on screen and count the
  rest.

## Dart/Flutter

**Pass when**

- Widget data comes from a real source: a constructor parameter, `State` fed by
  a `Future`/`Stream`, a `Provider`/`Riverpod`/`Bloc`/`Cubit` value, a
  repository or API call.
- Sample data, stub handlers and placeholder assets are **labelled** — a
  comment naming what is missing (`// STUB:`, `// TODO: connect to the real
  endpoint`), a clearly-named symbol (`sampleTeam`, `kPlaceholderAvatar`), or
  visible UI text saying the data is sample.
- Controls do something, or say that they do not.

**Fail when**

- A widget defines realistic-looking records inline and renders them with no
  `Future`/`Stream`/provider call anywhere in the widget or its ancestors, and
  nothing marks them as sample.
- A metric, count, or badge is a literal string in the build method — a
  `"+12% this month"` — with no note that it is invented.
- Placeholder media is wired in as if real: a `NetworkImage` or
  `Image.network` pointing at `via.placeholder.com`, `picsum.photos`,
  `i.pravatar.cc`, or similar.
- A control is wired to nothing and does not say so: `onPressed: () {}`,
  `onPressed: () => print(...)`, an `onTap` with no observable effect.
- A `Future`/`Stream` is created but its result is discarded and hardcoded
  values render anyway.

**Do not flag**

- Anything carrying an honest label, per *Pass when*.
- Generated files: `*.g.dart`, `*.freezed.dart`, and anything under
  `.dart_tool/` or `build/`.
- Tests and anything under `test/`, `test_driver/`, `integration_test/`.
- Genuine static content: route tables, theme tokens, l10n/`.arb` catalogues,
  validation messages, enum-backed labels.
- Empty-state and skeleton/shimmer loading widgets — a loading state, not fake
  data.
- Defaults and fallbacks: `?? 0`, `?? []`, a default avatar asset shipped with
  the app.
- Pre-existing unlabelled data in files this change merely touched, when the
  scope is `changes`.
- More than three instances. Name the three most visible on screen and count
  the rest.

## Go

**Pass when**

- Handler or response values come from a real source: a database query, an
  external service call, a request body, a config value.
- Sample data and stub handlers are **labelled** — a `// STUB:`/`// TODO:`
  comment or a clearly-named identifier (`sampleUsers`, `mockResponse`).
- An unimplemented handler returns an honest "not implemented" response
  (`http.StatusNotImplemented`, or an explicit `errors.New("not implemented")`)
  rather than silently returning empty or fake success data.

**Fail when**

- A handler returns a literal struct or JSON value with no call to a database,
  repository, or external service anywhere in its call path, and nothing marks
  it as a stub.
- A function whose name and signature promise real work (`FetchUser`,
  `GetOrders`) unconditionally returns a hardcoded value.
- A metric or count is a literal in the response path with no note that it is
  invented.
- A handler always returns success with empty or default data regardless of
  input, instead of performing or reporting the real operation.

**Do not flag**

- Anything carrying an honest label, per *Pass when*, including a handler that
  returns `http.StatusNotImplemented`.
- Generated files: `*_gen.go`, `*.pb.go`, and anything carrying a `// Code
  generated ... DO NOT EDIT.` header.
- Test files (`_test.go`) and anything under `testdata/`.
- Genuine static content: constant lookup tables, error message strings,
  documented config defaults.
- Pre-existing unlabelled data in files this change merely touched, when the
  scope is `changes`.
- More than three instances. Name the three clearest and count the rest.

## On fail

The `[FIX]` must offer **both** routes, because either is legitimate: wire it
to the real source, **or** label it honestly and say so in the handoff. For a
Go handler, an honest `http.StatusNotImplemented` response already counts as
the labelling route. State explicitly that deleting the visible text, hiding
the control, or adding a lint suppression does not count — the receiver must
be able to tell what is real.
````

- [ ] **Step 4: Reinstall and verify live — Dart/Flutter fixture**

```bash
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
mkdir -p ~/vet-scratch-check3-dart && cd ~/vet-scratch-check3-dart && git init -q
cp -r ~/vet/test/fixtures/pretends-finished-dart/* .
git add -A && git commit -q -m "scratch"
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected:** `Nothing pretends to be finished` reads `Fix this`, its `[WHAT]` names `pricing_card.dart`, and does **not** name `team_list.dart`.

- [ ] **Step 5: Verify live — Go fixture**

```bash
mkdir -p ~/vet-scratch-check3-go && cd ~/vet-scratch-check3-go && git init -q
cp -r ~/vet/test/fixtures/pretends-finished-go/* .
git add -A && git commit -q -m "scratch"
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected:** `Nothing pretends to be finished` reads `Fix this`, its `[WHAT]` names `handlers/pricing.go`, and does **not** name `handlers/team.go`.

- [ ] **Step 6: Commit**

```bash
cd ~/vet
git add -A
git commit -m "Widen nothing-pretends-to-be-finished to Dart/Flutter and Go

The concept -- a stub that presents itself as finished, rather than
saying what it is -- holds regardless of language; only the concrete
shape changes. Adds a Dart/Flutter section (onPressed: () {}, hardcoded
widget data with no Future/provider behind it, placeholder
NetworkImage hosts) and a Go section written in backend terms (a
handler returning a literal struct with no service call behind it,
distinguished from an honest http.StatusNotImplemented stub, which is
the labelling route rather than something to flag).

Adds a fixture pair per new language: an unlabelled stub that must
trip the check, and a labelled one that must not."
```

---

### Task 4: Update documentation and bump the plugin version

**Files:**
- Modify: `README.md`
- Modify: `.claude-plugin/plugin.json` — version `0.2.0` → `0.3.0`

- [ ] **Step 1: Widen the "what it does not do" claim**

In `README.md`, replace:

```markdown
And it only understands JavaScript and TypeScript
projects: with no `package.json` in sight, it says so plainly and stops,
rather than handing back a clean bill of health it has no way to back up.
```

with:

```markdown
And it only understands JavaScript/TypeScript, Dart/Flutter, and Go
projects: with none of `package.json`, `pubspec.yaml`, or `go.mod` in sight, it
says so plainly and stops, rather than handing back a clean bill of health it
has no way to back up.
```

- [ ] **Step 2: Widen the "Note" section explaining this repo's own guard trip**

In `README.md`, replace:

```markdown
This repo has no root `package.json`, so it isn't itself a JavaScript or
TypeScript project — running `/vet` here trips the project-type guard and
refuses, rather than checking anything. The fixtures under
`test/fixtures/pretends-finished/`, `test/fixtures/missing-pieces/`, and
`test/fixtures/leaked-secrets/` are exercised instead by copying them into a
separate scratch project — see `docs/writing-a-check.md`.
```

with:

```markdown
This repo has no root `package.json`, `pubspec.yaml`, or `go.mod`, so it isn't
itself a JavaScript/TypeScript, Dart/Flutter, or Go project — running `/vet`
here trips the project-type guard and refuses, rather than checking anything.
The fixtures under `test/fixtures/` are exercised instead by copying them into
a separate scratch project — see `docs/writing-a-check.md`. Each of the two
file-scoped checks has a JS, Dart, and Go fixture pair
(`missing-pieces`/`missing-pieces-dart`/`missing-pieces-go`,
`pretends-finished`/`pretends-finished-dart`/`pretends-finished-go`); the
secrets check has only one (`leaked-secrets/`), since its rule doesn't branch
by language.
```

- [ ] **Step 3: Bump the plugin version**

In `.claude-plugin/plugin.json`, change:

```json
"version": "0.2.0",
```

to:

```json
"version": "0.3.0",
```

- [ ] **Step 4: Validate and do a final clean-install check**

```bash
cd ~/vet
claude plugin validate .
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude plugin list | grep vet    # expect 0.3.0
grep -rn "only understands JavaScript and TypeScript" README.md docs/ || echo "no stale wording ✓"
```

**Expected:** validation passes, version reads `0.3.0`, and no documentation still claims JS/TS as the sole supported ecosystem.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "Docs: describe Dart/Flutter and Go support

Widens the README's project-type-guard wording and the note explaining
why this repo trips its own guard. Documents the new per-language
fixture pairs and why the secrets check has only one. Bumps to 0.3.0 so
installed copies actually refresh."
git push
```

---

## Verification summary

| Task | Live run proves |
|---|---|
| 1 | Guard refuses with none of the three manifests; asks which folder on a multi-manifest tree; Go/Dart/Flutter mechanical rows resolve from their own commands; Dart's single `analyze` run splits correctly by severity; Go's lint row renders only when `golangci-lint` resolves |
| 2 | Names the undeclared package and missing file for both Dart and Go; **not** the present ones |
| 3 | Names the unlabelled stub for both Dart/Flutter and Go; **passes** the labelled one, including the Go `http.StatusNotImplemented` case |
| 4 | Clean install at 0.3.0, no stale JS/TS-only wording |

## Gaps this plan does not close

Carried from the spec, deliberately:

1. **No fixture variant for the secrets check.** It doesn't branch by language, so `leaked-secrets/` alone already covers all three ecosystems that reach it.
2. **`golangci-lint`'s config detection is shallow.** Presence of a config file or the binary on `PATH` counts as "configured" — a project relying on a fully default `golangci-lint` run with neither gets no lint row, consistent with "never install," but worth naming so it isn't rediscovered as a bug.
3. **Dart's severity-split assumes standard `error`/`warning`/`info` labels.** A project with a heavily customized `analysis_options.yaml` that reclassifies severities could shift what lands in which row.
4. **Other ecosystems (Python, Rust, Java, …) remain unsupported.** This plan widens the guard to three ecosystems, not to "all of them," and the refusal message names exactly what's supported so the gap stays visible.
