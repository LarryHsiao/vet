# Fixtures: nothing calls a backend the project doesn't know

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `config.ts` | **No** | Declares the project's real API base (`api.acme.com`) via env var with fallback — the grounding source the other files are judged against. |
| `TeamPanel.tsx` | **No** | Calls through `apiFetch`, the project's shared wrapper around `config.ts`'s established host. Grounded. |
| `Invoice.tsx` | **Yes — fabricated host** | A fresh absolute URL on `api.acme-billing-service.io` — a host nothing in the project configures, and not a recognizable third party. |
| `BillingEvents.tsx` | **Yes — mismatched host** | A fresh absolute URL on `api.acme.io` — one character group away from the established `api.acme.com`; reads as a typo or a stale environment, not an invented backend. |
| `Payments.tsx` | **No** | Calls Stripe's own API directly, backed by the `stripe` dependency in `package.json`. Third-party and out of scope — must not trip even though the host matches nothing the project itself declared. |

**Invariant:** if a run flags `Payments.tsx`, the check is treating any
unrecognized absolute host as suspect rather than restricting itself to
first-party-shaped calls; if it fails to flag `Invoice.tsx` or
`BillingEvents.tsx`, it isn't grounding against `config.ts` at all.
