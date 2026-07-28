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
