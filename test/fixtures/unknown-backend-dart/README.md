# Fixtures: nothing calls a backend the project doesn't know (Dart/Flutter)

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `api_client.dart` | **No** | Declares the project's real API base (`api.acme.com`) via `String.fromEnvironment` with a default — the grounding source the other files are judged against. |
| `team_panel.dart` | **No** | Calls through `apiClient`, the project's shared `Dio` instance built on `api_client.dart`'s established host. Grounded. |
| `invoice.dart` | **Yes — fabricated host** | A fresh `Dio()` hitting `api.acme-billing-service.io` — a host nothing in the project configures, and not a recognizable third party. |
| `billing_events.dart` | **Yes — mismatched host** | A fresh `Dio()` hitting `api.acme.io` — one character group away from the established `api.acme.com`; reads as a typo or a stale environment, not an invented backend. |
| `payments.dart` | **No** | Calls Stripe's own API (`api.stripe.com`) directly — a recognizable third party. Third-party and out of scope — must not trip even though the host matches nothing the project itself declared. |

**Invariant:** if a run flags `payments.dart`, the check is treating any
unrecognized absolute host as suspect rather than restricting itself to
first-party-shaped calls; if it fails to flag `invoice.dart` or
`billing_events.dart`, it isn't grounding against `api_client.dart` at all.
