---
name: Screens handle waiting and failure
scope: [changes, project]
applies_to: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.ts", "**/*.js"]
---

A screen that fetches data has three states, not one: waiting, failed, and
loaded. Built with a fast local connection and a mock that always succeeds, only
the third one ever appears, so it is the only one that gets written. The
consequence is not subtle — on a real network the user sees a blank rectangle
for two seconds and assumes the page is broken, and when the request fails they
see the same blank rectangle forever with no way to know anything went wrong or
to try again. This is the defect that most reliably survives a demo and then
lands in a support queue, which is why it belongs in front of an engineer's
polish pass rather than after it.

Inspect the target for data-fetching components and check what the person sees
before the data arrives and when it never arrives.

**Pass when**

- Every component that triggers an asynchronous read renders something
  deliberate while it is pending: a spinner, a skeleton, a progress indicator, a
  disabled control, cached or optimistic content, or a Suspense boundary above
  it with a real `fallback`.
- Every such component renders something deliberate on failure: a message the
  user can understand, a retry affordance, a toast, or an error boundary above
  it that renders real UI (not `null`).
- The empty case is distinguishable from the loading case — "no results" and
  "still fetching" do not look identical.
- A data library's states are actually consumed: if the code destructures
  `isLoading`/`isPending`/`error` from React Query, SWR, Apollo, tRPC, RTK Query
  or similar, those values are branched on rather than destructured and ignored.
- Mutations triggered by a button disable or busy-state that button while in
  flight, so it cannot be double-submitted.

**Fail when**

- A component awaits or subscribes to data and returns `null`, `<></>`, `false`,
  or nothing at all while pending, with no Suspense boundary above it.
- An error path is swallowed: `catch {}`, `.catch(() => {})`,
  `catch (e) { console.error(e) }` with no state change, or an `error` value
  destructured and never read. The user is left staring at an empty box.
- A `try/catch` sets an error into state that nothing renders.
- The loading branch and the empty branch render the same thing, so an empty
  result is indistinguishable from a stalled request.
- A submit button fires an async mutation and is never disabled or busied,
  allowing a double-charge, double-post, or duplicate record.
- The only failure handling is an `alert()` or a bare `console.log`.

**Do not flag**

- Files under `node_modules/`, `.next/`, `dist/`, `build/`, `out/`, `coverage/`,
  `vendor/`, or any generated client (`*.generated.*`, `__generated__/`,
  Prisma/Supabase/OpenAPI-generated SDKs).
- Server components, route handlers, server actions, API routes, loaders,
  `getServerSideProps`, middleware, migrations, seed scripts, and CLI entry
  points. There is no user watching a spinner; a thrown error is the correct
  behaviour there.
- Fire-and-forget calls with no user-visible result: analytics beacons, logging,
  telemetry, prefetch, revalidation, cache warming, `navigator.sendBeacon`.
- Background polling or subscriptions that refresh already-rendered content. The
  user is looking at the previous data; a spinner would be wrong.
- Components that receive data purely as props and perform no fetch of their own.
  The state belongs to whoever fetches. Follow it up one level before deciding —
  if the parent handles it, this component passes.
- Any component sitting under a Suspense boundary with a non-null `fallback`, or
  under an error boundary that renders visible UI, even if that boundary is
  several levels up. Look for it before failing.
- Optimistic updates that intentionally render the final state immediately and
  reconcile later. That is a deliberate choice, not a missing state.
- Tests, stories, fixtures, mocks, `__mocks__/`, `msw/` handlers.
- Pre-existing gaps in files this change merely touched, when the scope is
  changes.
- A missing *empty* state alone, when loading and error are both handled. Say so
  in the note if you like, but it is not a failure on its own.
- More than three instances. Name the three that a user is most likely to hit
  and count the rest.
