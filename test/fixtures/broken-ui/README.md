# Broken UI fixtures

These files are deliberately broken. They are not built, imported, or shipped by
anything — they exist so `/vet` can be proven to actually fire rather than
passing vacuously.

| File | Should trip | Should NOT trip |
|---|---|---|
| `PricingCard.tsx` | *Buttons and links work with a keyboard* (a `<div onClick>` card and a `<span onClick>` acting as a button; an icon-only `<button>` with no accessible name) · *Nothing on screen is fake data* (hardcoded `PLANS` with invented "+N% this month" metrics, a `via.placeholder.com` image, a checkout handler that only logs) | — |
| `TeamList.tsx` | *Screens handle waiting and failure* (`return null` while pending, with no Suspense boundary above it; `.catch(() => {})` swallows the failure so a failed request looks identical to a stalled one) | *Nothing on screen is fake data* — this file fetches real data. If a run flags it here, that check is pattern-matching on messiness, not on its actual rule. |

**Invariant:** if you run the verification procedure and every row comes back
"Looks fine," Vet is broken, not these fixtures.

Running `/vet all` inside the Vet repo itself will flag this directory — that
is expected, and is the fastest smoke test available. It is not a bug to file.
