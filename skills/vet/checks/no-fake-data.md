---
name: Nothing on screen is fake data
scope: [changes, project]
applies_to: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.ts", "**/*.js"]
---

When an assistant is asked to build a screen, it will happily invent the data to
put on it — three plausible users, a revenue figure, a chart series, an avatar
from a placeholder service — so that the screen renders immediately. That is the
right move while building and the wrong thing to hand over, because the screen
looks finished. Nobody reviewing a screenshot can tell that the numbers are
invented and the list is hardcoded. It is discovered in staging, or by a
customer, or in a board deck. This check exists so the person who built it is the
one who finds out, while it is still cheap.

Inspect the target for invented data that reaches the interface, and for
interface controls wired to nothing.

**Pass when**

- Every value rendered to the user comes from a real source: props, state fed by
  a fetch, a query hook, route params, a form, a database call, a CMS, or a
  configuration file that is genuinely the source of truth.
- Sample and placeholder data is confined to tests, stories, fixtures, seeds, and
  mock servers, and is not imported by application code.
- Interactive controls do something: buttons call a handler, forms submit
  somewhere, links point at real routes.

**Fail when**

- A component defines an array or object of realistic-looking records
  (`const users = [{ name: "Sarah Chen", ... }]`, `const revenue = 48293`) and
  renders it, with no fetch anywhere in the component or its parents.
- Application code imports from a mock/fixture/sample module
  (`mockUsers`, `sampleData`, `dummyProducts`, `fakeOrders`, `seedData`,
  `placeholderPosts`) outside of tests and stories.
- Placeholder media is wired in as if real: `via.placeholder.com`,
  `placehold.co`, `picsum.photos`, `i.pravatar.cc`, `loremflickr`,
  `randomuser.me`, or Lorem ipsum shipped as user-facing copy.
- A metric, chart series, count, badge, or percentage is a literal in the render
  path rather than derived from data — a "+12% this month" that is a string.
- A control is wired to nothing that changes state or navigates: `onClick={() =>
  {}}`, `onClick={() => console.log('clicked')}`, `href="#"` on a nav item,
  `onSubmit` that only `preventDefault()`s, a `// TODO: connect to API` sitting
  where the call belongs.
- A fetch exists but its result is discarded and the hardcoded array is rendered
  anyway — the most deceptive variant, because the network tab looks right.

**Do not flag**

- Files under `node_modules/`, `.next/`, `dist/`, `build/`, `out/`, `coverage/`,
  `vendor/`, or any generated output.
- Tests, stories, fixtures, and mocks by location or name: `*.test.*`,
  `*.spec.*`, `*.stories.*`, `__tests__/`, `__mocks__/`, `test/`, `tests/`,
  `e2e/`, `cypress/`, `playwright/`, `fixtures/`, `mocks/`, `msw/`, `seed*`,
  `prisma/seed.*`, `scripts/seed*`, Storybook config, and anything a
  development-only guard fences off (`if (process.env.NODE_ENV !== 'production')`,
  `if (import.meta.env.DEV)`).
- Genuine static configuration and content that is legitimately hardcoded:
  navigation menus, footer links, marketing copy, feature lists, FAQ entries,
  pricing tiers on a marketing page, country and currency and timezone lists,
  enum labels, chart axis labels, unit strings, i18n message catalogues, theme
  tokens, colour maps, icon maps, route tables, validation messages.
- Empty-state, zero-state, onboarding, and skeleton-placeholder content. A
  skeleton row that shows grey blocks is not fake data, it is a loading state.
- Default values and sensible fallbacks: `?? 0`, `|| []`, a default avatar or
  initials shown when a real one is missing, a "Guest" display name.
- Demo, example, playground, sandbox, marketing, landing, and documentation
  routes — anything under `demo/`, `examples/`, `playground/`, `sandbox/`,
  `(marketing)/`, `docs/`, or a page whose whole purpose is illustration.
- Deliberate, labelled sample modes: code behind a `?demo=1` flag, a
  `SAMPLE_DATA` constant that is visibly gated, or content the UI itself labels
  as sample or preview.
- A hardcoded value in a component that also accepts it as an optional prop with
  that value as the default. That is a default, not a fake.
- Lorem ipsum inside a Storybook story or a design reference file.
- Pre-existing hardcoded data in files this change merely touched, when the scope
  is changes.
- More than three instances. Name the three most visible on screen and count the
  rest.
