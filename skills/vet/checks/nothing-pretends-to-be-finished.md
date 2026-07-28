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
