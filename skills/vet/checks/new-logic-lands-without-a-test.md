---
name: New logic lands without a test
scope: [changes]
applies_to: ["**/*.tsx", "**/*.jsx", "**/*.ts", "**/*.js", "**/*.dart", "**/*.go"]
---

An assistant building a feature writes the happy path and a test for it, then
moves on. The branches that only fire on failure — a rejected request, a
malformed response, an edge case nobody clicked through — often get written but
never exercised, because nothing in the moment forces the question. The gap is
invisible in the diff: the code compiles, the happy-path test is green, and the
untested branch looks exactly as finished as the tested one sitting beside it.
It surfaces only when a real user hits that path in production and nothing
caught it first.

**First**, check whether the project already has test infrastructure at all —
a `test/`, `__tests__/`, or `spec/` directory, or any file matching
`*.test.*`, `*.spec.*`, `*_test.go`, or `*_test.dart`, anywhere outside
`node_modules/`, `vendor/`, `.dart_tool/`, or `build/`. If none exists, stop and
return `n/a` with the note "no test infrastructure found" — introducing
testing to a project that has none at all is a bigger call than this check
should make on its own.

Otherwise, inspect the collected diff for new logic and judge coverage per the
language subsections below.

## JavaScript/TypeScript

**Pass when**

- A new exported function, hook, or component has at least one test case
  exercising it, found by name in a `*.test.*`/`*.spec.*` file anywhere in the
  project.
- Every new branch a changed, already-tested function gains — a new `catch`,
  `else`, early-return guard, or `switch`/`case` arm — has a test case whose
  assertions correspond to that branch's outcome, not just the function's
  pre-existing happy path.
- A new `.catch()`, or a `try`/`await` wrapped in error handling, has a test
  that simulates the rejection and checks the resulting behavior.

**Fail when**

- A new exported function, hook, or component has no test case referencing it
  anywhere in the project.
- An existing, already-tested function gains a new branch (an error path, a
  guard, a new case arm) and no test exercises that specific branch, while the
  function's other branches remain tested — the sibling-branch gap: the happy
  path stayed covered, the new failure path did not.
- A new async rejection/error path has no test simulating the failure.

**Do not flag**

- Pure type/interface changes, or a branch with no executable logic.
- A one-line pass-through, delegate, or getter with no branch of its own.
- Logging or telemetry-only additions (`console.error`, an analytics call)
  layered onto otherwise-tested logic.
- Files under `node_modules/`, `.next/`, `dist/`, `build/`, `out/`,
  `coverage/`, `vendor/`, or any generated client.
- Test, story, fixture, and mock files themselves: `*.test.*`, `*.spec.*`,
  `*.stories.*`, `__tests__/`, `__mocks__/`, `fixtures/`, `mocks/`, `msw/`.
- Pre-existing untested code in files this change merely touches, when it adds
  no new branch of its own.
- More than three instances. Name the three most consequential and count the
  rest.

## Dart/Flutter

**Pass when**

- A new exported function, method, or widget has at least one test case
  exercising it, found in a file under `test/` or `integration_test/`.
- Every new branch a changed, already-tested unit gains — a new `catch`,
  `else`, early return, or `switch`/`case` arm — has a test case corresponding
  to that branch's outcome.
- A new `Future`/`Stream` error path (an `onError`, a `catchError`, a
  try/catch around an `await`) has a test simulating the failure.

**Fail when**

- A new exported function, method, or widget has no test case referencing it
  anywhere under `test/` or `integration_test/`.
- An existing, already-tested unit gains a new branch and no test exercises
  that specific branch, while its other branches remain tested.
- A new async error path has no test simulating the failure.

**Do not flag**

- A one-line pass-through, delegate, or getter with no branch of its own.
- Generated files: `*.g.dart`, `*.freezed.dart`, and anything under
  `.dart_tool/` or `build/`.
- Files already under `test/`, `test_driver/`, `integration_test/`.
- Pre-existing untested code in files this change merely touches, when it adds
  no new branch of its own.
- More than three instances. Name the three most consequential and count the
  rest.

## Go

**Pass when**

- A new exported function or method has at least one test case exercising it
  in a sibling `_test.go` file.
- Every new branch a changed, already-tested function gains — a new error
  return, an `if err != nil` path, a new `switch`/`case` arm — has a test case
  corresponding to that branch's outcome.

**Fail when**

- A new exported function or method has no test case referencing it in any
  `_test.go` file.
- An existing, already-tested function gains a new branch and no test
  exercises that specific branch, while its other branches remain tested.
- A new function's error-return path (an `if err != nil` branch it introduces)
  has no test case simulating that failure and asserting the error is handled
  — even when the function's success path is tested. A test case existing for
  the function is not the same as a test case for each of its branches.

**Do not flag**

- A one-line pass-through or getter with no branch of its own.
- Generated files: `*_gen.go`, `*.pb.go`, and anything carrying a `// Code
  generated ... DO NOT EDIT.` header.
- Test files (`_test.go`) themselves, and anything under `testdata/`.
- Pre-existing untested code in files this change merely touches, when it adds
  no new branch of its own.
- More than three instances. Name the three most consequential and count the
  rest.

## On fail

`[WHAT]` names the specific function(s) or branch(es) with no exercising test,
and which sibling branch in the same unit *is* tested — that contrast is what
makes the gap visible rather than abstract.

`[FIX]` must:

- Name the exact file and function/branch, and instruct the assistant to add a
  test case naming the expected outcome for that branch before asserting
  against it — not just a test that happens to pass.
- Never suggest deleting the branch, weakening it to remove the need for a
  test, or marking the test `skip`/`todo`/`xit` to make the check pass.
- Check the project's own root `CLAUDE.md` or `AGENTS.md` (not any personal or
  global one) for an existing convention requiring tests for new code. If one
  already exists, cite it instead of proposing a new one. If neither file
  exists, or exists but says nothing about testing, add exactly one line
  suggesting the project adopt a short rule — for example: "New code lands
  with a test that names the expected outcome before asserting it." — and
  note this is a team convention worth writing down once, not a per-instance
  fix.
