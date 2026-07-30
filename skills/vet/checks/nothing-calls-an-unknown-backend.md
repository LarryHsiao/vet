---
name: Nothing calls a backend the project doesn't know
scope: [changes, project]
applies_to: ["**/*.tsx", "**/*.jsx", "**/*.ts", "**/*.js", "**/*.vue", "**/*.svelte", "**/*.dart"]
---

An assistant wiring up a screen writes whatever call completes the feature. When
the real endpoint is unclear, unbuilt, or misremembered, it writes a
plausible-looking one anyway — a host shaped like the project's own API,
sitting on a domain the project never configured. The request compiles, so
nothing signals a problem while building. It surfaces only when the call is
actually exercised and quietly fails, or worse, sends real data somewhere
nobody chose.

This check evaluates only calls that read as **first-party** — shaped like a
call to the project's own backend (a REST-ish path, a JSON body, no SDK
package backing it). It does not evaluate third-party integrations at all:
whether a Stripe or Mapbox call is the *right* one is an intent question this
check cannot answer from the code alone. It only asks whether a call that
looks like it's meant for our own backend actually points at a host the
project has ever configured.

## JavaScript/TypeScript

An established host is one findable in the project itself: an env var already
read elsewhere for the API base (`process.env.API_URL`,
`process.env.NEXT_PUBLIC_API_BASE`, `import.meta.env.VITE_API_URL`), a
constants/config file declaring a base URL, an existing `axios`/`fetch`
wrapper's configured host, or a sibling call site elsewhere in the project
already hitting that host.

**Pass when**

- The new call is a relative path (same-origin, no host at all).
- The new call goes through the project's existing HTTP client or wrapper
  (a configured `axios` instance, a shared `fetch` helper, a generated API
  client) rather than a fresh raw absolute URL.
- The new call's absolute host matches a host already established per the
  sources above.
- The new call's host is a recognizable third-party integration, or matches a
  package already declared as a dependency that talks to it (`stripe` calling
  `api.stripe.com`, `@sentry/*` calling `*.sentry.io`). Out of scope — do not
  evaluate whether the integration itself is warranted.

**Fail when**

- **Fabricated host** — a new hardcoded absolute URL, shaped like a call to
  our own backend, whose host matches nothing established in the project and
  isn't a recognizable third party either.
- **Mismatched host** — a new hardcoded absolute URL whose host is close to,
  but not identical to, an established one — a different TLD, an added or
  dropped subdomain, a look-alike spelling. Reads as a typo or a stale
  environment left in, not an invention, and gets its own fix text below.

**Do not flag**

- Calls made through the project's existing HTTP client/wrapper, even when the
  literal host isn't repeated at this call site.
- Any third-party host, and any host matching a package already declared as a
  dependency that talks to it — this check does not evaluate third parties.
- `localhost`, `127.0.0.1`, `0.0.0.0`, and any host behind a development-only
  guard (`process.env.NODE_ENV !== 'production'`, `import.meta.env.DEV`).
- Tests, stories, fixtures and mocks: `*.test.*`, `*.spec.*`, `*.stories.*`,
  `__tests__/`, `__mocks__/`, `fixtures/`, `mocks/`, `msw/`.
- Pre-existing unlabelled hosts in files this change merely touched, when the
  scope is `changes`.
- A host you have not checked the project's env vars and config files for. If
  you cannot confirm it's ungrounded, do not guess.
- More than three instances. Name the three clearest and count the rest.

## Dart/Flutter

An established host is one findable in the project itself: a
`String.fromEnvironment`/`--dart-define` value or `flutter_dotenv` value
already read elsewhere for the API base, a constants/config file declaring a
`baseUrl`, the project's shared `Dio`/`http.Client` instance's configured
host, or a sibling call site elsewhere in the project already hitting that
host.

**Pass when**

- The new call goes through the project's shared `Dio`/`http.Client` instance
  rather than a freshly constructed client with an inline absolute URL.
- The new call's absolute host matches a host already established per the
  sources above.
- The new call's host is a recognizable third-party integration, or matches a
  package already declared as a dependency that talks to it. Out of scope.

**Fail when**

- **Fabricated host** — a new inline absolute URL, shaped like a call to our
  own backend, constructed on a fresh client rather than the shared one, whose
  host matches nothing established in the project and isn't a recognizable
  third party either.
- **Mismatched host** — a new inline absolute URL whose host is close to, but
  not identical to, an established one.

**Do not flag**

- Calls made through the project's shared `Dio`/`http.Client` instance, even
  when the literal host isn't repeated at this call site.
- Any third-party host, and any host matching a package already declared as a
  dependency that talks to it.
- `localhost`, `127.0.0.1`, and `10.0.2.2` (the Android emulator's host-loopback
  alias).
- Tests and anything under `test/`, `test_driver/`, `integration_test/`.
- Pre-existing unlabelled hosts in files this change merely touched, when the
  scope is `changes`.
- A host you have not checked the project's env vars and config files for. If
  you cannot confirm it's ungrounded, do not guess.
- More than three instances. Name the three clearest and count the rest.

## On fail

**Fabricated host** — name the file and the host. Offer both routes, because
either is legitimate: wire it to the project's real config value (name the
env var or config the project already uses elsewhere), or, if this genuinely
is a new endpoint the feature needs, say so plainly and ask the person to
confirm it's real before it ships. This check cannot tell a legitimate new
integration from an invented one — only that nothing in the project yet backs
it. Never suggest deleting the check or suppressing it; the receiver still
needs to know.

**Mismatched host** — name the file, the literal host used, and the
established host it sits close to. The fix is almost always correcting the
literal, not adding new config.
