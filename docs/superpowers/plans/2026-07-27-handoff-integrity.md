# Vet Handoff-Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Vet's code-quality check list with a handoff-integrity one, and make `/vet` emit a committed `HANDOFF.md` that the receiving engineer's AI reads.

**Architecture:** Vet is a Claude Code plugin made entirely of markdown and JSON — no compiled code, no runtime. `skills/vet/SKILL.md` is the procedure; each file in `skills/vet/checks/` is one check dispatched to one subagent in parallel. This plan rewrites the check set, splits the mechanical tooling rows, and adds an artifact-writing step. The dispatch machinery (run tokens, pinned table, target cascade) is untouched.

**Tech Stack:** Markdown skill files, JSON plugin manifests, `git`, the `claude` CLI for verification.

## Global Constraints

Copied verbatim from the spec — every task's requirements implicitly include these.

- **The test every check must pass:** *can the receiving AI recover this on its own?* If yes, it is not Vet's business.
- **Vet writes one file, which is its own.** It never edits the person's source, never commits, never pushes, never installs. `HANDOFF.md` and `.vet/` scratch are the only writes.
- **Never render a report with zero checks.** A confident false all-clear is the worst output this tool can produce.
- **Never fail a mechanical row because tooling is absent.** Missing tooling is not a defect in the feature.
- **Ask, never gate.** Offering `npm install` never blocks the report; declining is legitimate and is never nagged.
- **Report vocabulary bans:** *diff, HEAD, merge-base, working tree, staged, SHA, file:line*, emoji, severity jargon.
- **Result cells hold one fixed status word**, nothing appended. Headings are `### <N>. <name>`. Two runs over identical code must produce byte-identical table rows.
- **Every `[FIX]` that could be silenced must say so explicitly** — no `eslint-disable`, no `@ts-ignore`, no deleting the check.
- **`Do not flag` is the longest section of every check**, and must exclude vendored UI (`components/ui/`, shadcn, Radix), generated clients, tests, stories, fixtures, and pre-existing debt in merely-touched files.

## Testing Reality — read before starting

**There is no unit-test harness.** Vet is markdown; its behaviour only exists when a model executes it. So every task's verification is a **live run** of the skill:

```bash
# refresh the installed copy (plugin cache is a snapshot, and
# `plugin update` only acts on a version bump)
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools

# run it
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check <target>. Follow its SKILL.md exactly."
```

Each run takes 1–3 minutes and consumes account quota. **Tasks are therefore sized so each ends in exactly one meaningful live run** — do not run after every edit.

**Every check needs both controls.** A fixture that trips it *and* a fixture that must not. A check that fires on both is pattern-matching on messiness, not applying its rule — that failure has already occurred once in this repo's history and is the single most valuable thing these fixtures catch.

### Two known traps

1. **`.gitignore` blocks `.env` fixtures.** Lines 13–14 are `.env` and `.env.*`, so a committed `.env` fixture is impossible. Fixtures store it as `dotenv-fixture.txt` and the verification step copies it to `.env` inside a scratch directory outside the repo.
2. **A fixture `package.json` must stay nested.** Mechanical rows resolve from the *project root* only, so `test/fixtures/**/package.json` will not make Vet treat this repo as a Node project. Do not add one at the root.

---

### Task 1: Reframe the surviving check and retire the two polish checks

The fake-data check survives but its rule changes: the defect is not that a stub exists, it is that a stub **pretends to be finished**. A labelled stub is honest and must pass. This is what makes the check compatible with a PM deliberately handing off half-built work.

**Files:**
- Create: `skills/vet/checks/nothing-pretends-to-be-finished.md`
- Delete: `skills/vet/checks/no-fake-data.md`
- Delete: `skills/vet/checks/interactive-elements-accessible.md`
- Delete: `skills/vet/checks/loading-and-error-states.md`
- Create: `test/fixtures/pretends-finished/PricingCard.tsx`
- Create: `test/fixtures/pretends-finished/TeamList.tsx`
- Create: `test/fixtures/pretends-finished/README.md`
- Delete: `test/fixtures/broken-ui/` (all three files)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the check filename `nothing-pretends-to-be-finished.md`, whose frontmatter `name:` is `Nothing pretends to be finished`. Tasks 5 and 6 reference that exact display name.

- [ ] **Step 1: Write the two fixtures — the positive and negative control**

`test/fixtures/pretends-finished/PricingCard.tsx` — MUST trip the check. Unlabelled hardcoded data, an invented metric, a placeholder asset, and a checkout that only logs:

```tsx
import { useState } from "react";

const PLANS = [
  { id: "starter", name: "Starter", price: 19, saved: "+12% this month" },
  { id: "team", name: "Team", price: 49, saved: "+31% this month" },
];

export function PricingCard() {
  const [selected, setSelected] = useState("team");

  return (
    <div>
      {PLANS.map((plan) => (
        <button key={plan.id} type="button" onClick={() => setSelected(plan.id)}>
          <h3>{plan.name}</h3>
          <p>${plan.price}</p>
          <p>{plan.saved}</p>
        </button>
      ))}
      <button type="button" onClick={() => console.log("checkout", selected)}>
        Choose plan
      </button>
      <img src="https://via.placeholder.com/24" alt="" />
    </div>
  );
}
```

`test/fixtures/pretends-finished/TeamList.tsx` — MUST NOT trip it. Same stub shape, but labelled, so it is honest:

```tsx
// STUB: the team API is not built yet. This renders fixed sample rows so the
// page layout can be reviewed. Replace loadTeam() with the real endpoint.
type Member = { id: string; name: string };

const SAMPLE_TEAM: Member[] = [
  { id: "1", name: "Sample Person" },
  { id: "2", name: "Another Sample" },
];

function loadTeam(): Member[] {
  return SAMPLE_TEAM;
}

export function TeamList() {
  const members = loadTeam();
  return (
    <ul>
      {members.map((m) => (
        <li key={m.id}>{m.name} (sample data)</li>
      ))}
    </ul>
  );
}
```

`test/fixtures/pretends-finished/README.md`:

```markdown
# Fixtures: nothing pretends to be finished

Deliberately written to exercise one check. Not built, imported, or shipped.

| File | Must trip? | Why |
|---|---|---|
| `PricingCard.tsx` | **Yes** | Hardcoded plans with an invented "+12% this month", a placeholder image host, and a checkout that only logs — none of it labelled. It reads as finished. |
| `TeamList.tsx` | **No** | The same stub shape, but a `STUB:` comment states what is missing and the UI says "sample data". Honest, so it passes. |

**Invariant:** if a run flags `TeamList.tsx`, the check is pattern-matching on
stub-shaped code rather than applying its rule, and is wrong.
```

- [ ] **Step 2: Write the reframed check**

`skills/vet/checks/nothing-pretends-to-be-finished.md`:

````markdown
---
name: Nothing pretends to be finished
scope: [changes, project]
applies_to: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.ts", "**/*.js"]
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
not build it.

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

On fail, the `[FIX]` must offer **both** routes, because either is legitimate:
wire it to the real source, **or** label it honestly and say so in the handoff.
State explicitly that deleting the visible text, hiding the control, or adding a
lint suppression does not count — the receiver must be able to tell what is real.
````

- [ ] **Step 3: Delete the retired checks and old fixtures**

```bash
git rm skills/vet/checks/no-fake-data.md \
       skills/vet/checks/interactive-elements-accessible.md \
       skills/vet/checks/loading-and-error-states.md
git rm -r test/fixtures/broken-ui
```

- [ ] **Step 4: Reinstall and run the live verification**

```bash
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected — all four, or the task is not done:**
1. The table has exactly **one** dispatched row, named `Nothing pretends to be finished`.
2. That row reads `Fix this`.
3. Its `[WHAT]` names `PricingCard.tsx`.
4. Its `[WHAT]` does **not** name `TeamList.tsx`. This is the discrimination test — a run flagging both has failed even though the row is red.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Reframe fake-data check as nothing-pretends-to-be-finished

The defect is not that a stub exists -- handing off half-built work is
legitimate. It is a stub presenting itself as finished, which misleads
the receiving AI into reading it as the intended design. A labelled
stub now passes.

Retires the accessibility and loading-state checks: both are polish the
engineer's AI fixes unprompted, so they fail the test of whether the
receiver can recover it alone."
```

---

### Task 2: Add the "everything it needs is actually here" check

The load-bearing check. The mechanical rows need `node_modules` present to run, so the case most worth catching — dependencies broken or undeclared — is exactly where they go silent. This one is static and works with nothing installed.

**Files:**
- Create: `skills/vet/checks/everything-needed-is-here.md`
- Create: `test/fixtures/missing-pieces/package.json`
- Create: `test/fixtures/missing-pieces/src/App.tsx`
- Create: `test/fixtures/missing-pieces/src/Header.tsx`
- Create: `test/fixtures/missing-pieces/README.md`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: check display name `Everything it needs is actually here`, referenced by Tasks 5 and 6.

- [ ] **Step 1: Write the fixtures**

`test/fixtures/missing-pieces/package.json` — declares only `react`, while the code imports `date-fns` too:

```json
{
  "name": "missing-pieces-fixture",
  "private": true,
  "version": "0.0.0",
  "dependencies": {
    "react": "^18.2.0"
  }
}
```

`test/fixtures/missing-pieces/src/App.tsx` — MUST trip: imports an undeclared package *and* a file that does not exist:

```tsx
import { format } from "date-fns";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function App() {
  return (
    <div>
      <Header />
      <Sidebar />
      <p>{format(new Date(), "yyyy-MM-dd")}</p>
    </div>
  );
}
```

`test/fixtures/missing-pieces/src/Header.tsx` — the negative control: imported and present, so it must NOT be flagged:

```tsx
export function Header() {
  return <header>Fixture header</header>;
}
```

`test/fixtures/missing-pieces/README.md`:

```markdown
# Fixtures: everything it needs is actually here

Deliberately incomplete. Not built, imported, or shipped.

| Import in `src/App.tsx` | Must trip? | Why |
|---|---|---|
| `date-fns` | **Yes** | Imported but absent from `package.json` — a fresh install will not have it. |
| `./Sidebar` | **Yes** | Imported but the file does not exist. |
| `./Header` | **No** | Imported and present. Flagging it means the check is not resolving relative paths. |
| `react` | **No** | Imported and declared. |

Note `Sidebar.tsx` is *absent by design*. Do not create it to "fix" the fixture.
```

- [ ] **Step 2: Write the check**

`skills/vet/checks/everything-needed-is-here.md`:

````markdown
---
name: Everything it needs is actually here
scope: [changes, project]
applies_to: ["**/*.tsx", "**/*.jsx", "**/*.ts", "**/*.js", "**/*.vue", "**/*.svelte"]
---

Work that runs on the machine it was built on will not necessarily run anywhere
else. A file can be imported but never committed; a package can resolve locally
through some other dependency and vanish on a fresh install. Both are invisible
to the person who built it, because their machine already has what is missing.
The receiving engineer meets it as a broken clone, and the first hour of the
handoff goes to reconstructing an environment rather than doing the work.

Resolve every import in the target and report the ones that would not resolve
for someone starting from a fresh clone.

**Two ways to resolve, and both must be tried in order.** If the project is
tracked in git, compare against the files git knows about, so a file present on
disk but never committed is correctly reported as missing. If the project is
**not** tracked in git — which is common, because the person's assistant
scaffolded the project and nobody ran `git init` — fall back to comparing
against the files on disk. Never skip the check because git is absent; the
disk comparison still catches every missing file and every undeclared package.

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
- Asset imports the bundler handles: `.css`, `.scss`, `.svg`, `.png`, `.jpg`,
  `.webp`, `.json`, `?raw`, `?url`, `?worker` suffixes.
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

On fail, the `[FIX]` names each missing item and its route: commit the file, or
add the package with the exact command (`npm install <pkg>`), or correct the
path. Do not suggest deleting the import to make the error disappear, and do not
suggest a lint suppression — the code needs the thing it is asking for.
````

- [ ] **Step 3: Reinstall and verify live**

```bash
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected:** two dispatched rows now. `Everything it needs is actually here` reads `Fix this`, its `[WHAT]` names both `date-fns` and `Sidebar`, and does **not** name `Header` or `react`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add the everything-it-needs-is-here check

Catches the literal fresh-clone breakage: a file imported but never
committed, a package imported but undeclared. Load-bearing, because the
mechanical rows need node_modules present and so go silent in exactly
the case most worth catching. Carries a disk-based fallback so it still
works in a project that was never git-initialised."
```

---

### Task 3: Add the "no private keys or config" check

**Files:**
- Create: `skills/vet/checks/no-committed-secrets.md`
- Create: `test/fixtures/leaked-secrets/dotenv-fixture.txt`
- Create: `test/fixtures/leaked-secrets/config.ts`
- Create: `test/fixtures/leaked-secrets/api.ts`
- Create: `test/fixtures/leaked-secrets/README.md`

**Interfaces:**
- Consumes: nothing from Tasks 1–2.
- Produces: check display name `No private keys or config left in the code`, referenced by Tasks 5 and 6.

- [ ] **Step 1: Write the fixtures**

`test/fixtures/leaked-secrets/dotenv-fixture.txt` — cannot be named `.env`, because `.gitignore` lines 13–14 block it:

```
# Copied to `.env` by the verification step. Fake values, safe to commit here.
STRIPE_SECRET_KEY=sk_live_51ABCdefGHIjklMNOpqrsTUVwxyz0123456789
DATABASE_URL=postgres://appuser:hunter2@db.internal:5432/production
```

`test/fixtures/leaked-secrets/config.ts` — MUST trip, hardcoded key in source:

```ts
export const STRIPE_KEY = "sk_live_51ABCdefGHIjklMNOpqrsTUVwxyz0123456789";

export const DB_URL = "postgres://appuser:hunter2@db.internal:5432/production";
```

`test/fixtures/leaked-secrets/api.ts` — the negative control. Reads config from the environment, which is correct, and must NOT be flagged as a leak. It *may* be cited for the undocumented-env-var half, since no `.env.example` exists:

```ts
const KEY = process.env.STRIPE_SECRET_KEY;

export async function charge(cents: number) {
  return fetch("https://api.stripe.com/v1/charges", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: String(cents),
  });
}
```

`test/fixtures/leaked-secrets/README.md`:

```markdown
# Fixtures: no private keys or config left in the code

Every value here is **fake** and safe to commit. They match real key shapes so
the check has something to recognise; none of them work.

| File | Must trip? | Why |
|---|---|---|
| `config.ts` | **Yes** | A `sk_live_` key and a connection string with a password, hardcoded in source. |
| `dotenv-fixture.txt` | **Yes**, once copied to `.env` | `.gitignore` blocks a committed `.env`, so the verification step copies this into a scratch project. |
| `api.ts` | **No, not as a leak** | Reads from `process.env` — the correct pattern. It may legitimately be cited for the *undocumented env var* half, since no `.env.example` exists. |

**The report must never echo a key back**, beyond a short prefix. If a run
reprints a full value, the check is wrong even when the row is correct.
```

- [ ] **Step 2: Write the check**

`skills/vet/checks/no-committed-secrets.md`:

````markdown
---
name: No private keys or config left in the code
scope: [changes, project]
---

An assistant asked to make an app work will write the credential wherever it is
needed, because that is the shortest path to a running app. Nothing in that
moment tells the person the value should not be committed.

At handoff this stops being a housekeeping matter. The whole premise is that
**another AI reads this codebase**. A committed credential lands in someone
else's model context, and their assistant will treat it as the working
configuration rather than flagging it. The mirror case is just as costly in the
other direction: a required setting that is documented nowhere means the
receiver cannot run the project at all and cannot tell what is missing.

Inspect the target for credentials that should not be in the code, and for
configuration the receiver would need and cannot find.

**Concrete key shapes** (match by prefix or pattern):

- Stripe: `sk_live_`, `sk_test_`, `rk_live_`, `rk_test_`
- AWS: `AKIA[0-9A-Z]{16}`, `ASIA[0-9A-Z]{16}`, or 40 chars of `[A-Za-z0-9/+=]`
  beside `aws_secret_access_key`
- GitHub: `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` plus 36 or more characters
- Slack: `xox[baprs]-`
- OpenAI / Anthropic: `sk-[A-Za-z0-9]{40,}`, `sk-ant-[A-Za-z0-9-]{90,}`
- Google: `AIza[0-9A-Za-z_-]{35}`
- Private keys: any `-----BEGIN ` … `PRIVATE KEY-----` block
- JWTs: three dot-separated base64url segments, the first decoding to `{"alg":`

**Heuristic shapes:**

- Connection strings carrying credentials: `<scheme>://<user>:<password>@<host>`
  with a non-empty, non-placeholder password.
- Assignments whose key looks credential-bearing (`*_TOKEN`, `*_SECRET`,
  `*_KEY`, `*_PASSWORD`, `*_API_KEY`) with a non-empty, non-placeholder value.

**Pass when**

- No matching value appears outside the exclusions below.
- Credentials are read from the environment (`process.env.X`, `import.meta.env.X`)
  rather than written in source.
- Every environment variable the code reads is documented somewhere the receiver
  will find it — `.env.example`, `.env.template`, or the README.

**Fail when**

- A `.env` (or `.env.local`, `.env.production`) is committed to the project.
- Any concrete key shape or heuristic shape appears in source, configuration, a
  script, or a committed notebook.
- The code reads an environment variable that nothing documents, and no
  `.env.example` exists. Report this as *missing documentation*, distinctly from
  a leak — the fixes are different and confusing them wastes the reader's time.

**Do not flag**

- `.env.example`, `.env.template`, `.env.sample` and their contents, provided
  values are placeholders (`your-key-here`, `xxx`, empty).
- Public and publishable values that are meant to ship: `pk_live_`, `pk_test_`,
  Firebase web config, a Supabase anon key, a Sentry DSN, any `NEXT_PUBLIC_*` or
  `VITE_*` variable. These are designed to be visible in a browser bundle.
- Documentation and comments whose value is clearly marked fake, sample,
  example, or placeholder.
- Test fixtures using obviously non-production values (`test_key_123`,
  `EXAMPLE_KEY`, `<your-token-here>`).
- Public keys and certificates: `-----BEGIN PUBLIC KEY-----`, `ssh-rsa AAAA…` in
  an `authorized_keys`-style file, `.pub` files.
- Stored hashes rather than plaintext.
- Random-looking strings demonstrably not credentials: UUIDs, commit SHAs,
  content hashes, lockfile integrity digests, CSS hashes.
- Anything under `node_modules/`, `dist/`, `build/`, `.next/`, `coverage/`,
  `vendor/`, or a lockfile.
- More than three instances. Name the three and count the rest.

**Two rules this check must obey.**

**Never echo a secret back.** Name the file and the kind of credential, and
quote at most the first few characters of the prefix. A report that reprints a
credential has copied it somewhere new — including into the transcript of
whoever reads the report.

**The `[FIX]` must say rotate, not merely delete.** Removing a key from a file
does not un-leak it if it was ever committed; it remains in the project's
history. The honest instruction is to **revoke the credential and issue a new
one**, then move the new value into a `.env` that is git-ignored, and add the
variable name to `.env.example`. State this explicitly, because deleting the
line looks fixed, turns the next run green, and leaves a live credential
reachable. For the undocumented-variable case the fix is the opposite and much
smaller: add the name, with a placeholder value, to `.env.example`.
````

- [ ] **Step 3: Reinstall and verify live**

```bash
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill (from the vet plugin) to check this whole project (target: all). Follow its SKILL.md exactly. Output only the report."
```

**Expected:** three dispatched rows. The secrets row reads `Fix this`, names `config.ts`, quotes **no** full credential (`sk_live_…` prefix at most), and its `[FIX]` says revoke/rotate — not merely delete.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add the no-committed-secrets check

Restores a check the original seed baton called for and the walking
skeleton dropped. Sharper reason to exist under the handoff framing: a
committed credential lands in the receiving AI's context and gets used
as working config rather than flagged.

Two rules the check must obey: never echo a secret beyond its prefix,
and say rotate rather than delete -- removing a key from a file leaves
it in history while turning the next run green."
```

---

### Task 4: Split the mechanical rows and guard non-JS projects

**Files:**
- Modify: `skills/vet/SKILL.md` — Step 5 (mechanical rows) and Step 2 (project-type guard)

**Interfaces:**
- Consumes: nothing.
- Produces: three mechanical row labels — `The code compiles`, `The project's tests pass`, `The project's linter passes` — used by Task 5's `HANDOFF.md` known-broken section.

- [ ] **Step 1: Rewrite Step 5**

Replace the body of `## Step 5` with three separately-resolved rows. Each renders **only** when its source resolves; a row with no source is not rendered at all, never as "skipped":

| Row | Resolves from |
|---|---|
| `The code compiles` | a `typecheck` or `build` script in `package.json`; else `npx tsc --noEmit` when a `tsconfig.json` exists |
| `The project's tests pass` | a `test` script |
| `The project's linter passes` | a `lint` script |

Keep verbatim the existing dependency-ask behaviour: when a row's source resolves but `node_modules` is absent, render `Couldn't run`, state the reason and name `npm install`, and carry on — *an offer, never a gate*, no nagging, report still renders in full.

Add this note to the step, because it is the reason the split matters:

> `The code compiles` is the direct detection of the top failure mode. Lint is
> retained knowingly despite polish being out of scope: its output is
> mechanically true, cannot false-positive, and rules such as `exhaustive-deps`
> and `no-undef` catch real defects rather than style. If it proves noisy in
> practice, this is the paragraph to revisit.

- [ ] **Step 2: Add the project-type guard to Step 2**

All three dispatched checks assume Node/JS. Add, before the target cascade:

> **Project-type guard.** If no `package.json` exists anywhere in the target,
> Vet cannot check this project. Say so plainly and stop: "Vet only understands
> JavaScript and TypeScript projects at the moment, and this one doesn't look
> like either — so I haven't checked it. I'd rather tell you that than give you
> a clean bill of health I can't back up." Never render a report. A confident
> all-clear on a project Vet cannot read is the worst output it can produce.

- [ ] **Step 3: Verify both paths live**

The repo itself has **no** root `package.json`, so it now exercises the guard. Create a scratch project outside the repo for the positive path:

```bash
# guard path — run in the vet repo itself
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill to check this whole project (target: all). Follow its SKILL.md exactly."

# mechanical-row path — scratch project
mkdir -p ~/vet-scratch/src && cd ~/vet-scratch && git init
printf '{\n  "name":"s","private":true,\n  "scripts":{"lint":"echo lint-ok","test":"echo test-ok"}\n}\n' > package.json
cp ~/phantom/vet/test/fixtures/pretends-finished/PricingCard.tsx src/
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *) Bash(npm *) Bash(npx *)" \
  -p "Use the vet skill to check this project. Follow its SKILL.md exactly."
```

**Expected — guard path:** no table at all, and the plain refusal message. **Expected — scratch path:** `The project's tests pass` and `The project's linter passes` render; `The code compiles` does **not** render, because that project has no `typecheck`/`build` script and no `tsconfig.json`.

- [ ] **Step 4: Commit**

```bash
cd ~/phantom/vet
git add -A
git commit -m "Split mechanical rows and guard non-JS projects

Compile, tests and lint were one undifferentiated 'project's own
checks' block. Under the handoff framing they are different things:
compile is the direct detection of the top failure mode, while lint is
retained knowingly despite polish being out of scope. Each row now
resolves from a named source and simply does not render when its source
is absent -- never as a 'skipped' row, which reads as a chore.

Adds a project-type guard: with no package.json, Vet says it cannot
check this project rather than reporting a clean bill it cannot back."
```

---

### Task 5: Write `HANDOFF.md`

The artifact the receiving AI actually reads. This is the task that changes Vet's audit-only promise, so the promise is restated precisely rather than quietly broken.

**Files:**
- Modify: `skills/vet/SKILL.md` — new Step 9, plus the audit-only rule in the header section
- Modify: `skills/vet/reference/report-format.md` — add the `HANDOFF.md` template

**Interfaces:**
- Consumes: the three check display names from Tasks 1–3 and the three mechanical row labels from Task 4.
- Produces: `HANDOFF.md` at the project root.

- [ ] **Step 1: Add Step 9 to `SKILL.md`**

After Step 8 (the report), add:

> ## Step 9 — Write `HANDOFF.md`
>
> The report tells the person what to fix. `HANDOFF.md` tells the **next
> reader** — an engineer's AI, which never sees the chat — what it cannot
> reconstruct from the code. Write it to the project root after the report.
>
> **Ask exactly one question first.** What the person actually exercised exists
> nowhere in the code, and no static check can recover it: *"Before I write the
> handoff notes — which parts of this did you actually try yourself? Anything
> you clicked through and saw working, and anything you never opened."* Accept
> whatever they say, verbatim. If they decline or say nothing, write *"Not
> recorded."* — **never** imply verification that did not happen.
>
> This is the only question Vet asks. Everything else stays auto-detected.
>
> **Staleness.** Record the commit the file was generated against. On a later
> run, if `HANDOFF.md` exists and names a different commit, say so plainly and
> rewrite it. A handoff document describing code that has since changed misleads
> the receiver with authority — the exact failure this tool exists to prevent.
>
> **Vet writes this file and stops.** It does not commit it, does not stage it,
> does not push. Tell the person it was written and that committing it is their
> call. Vet writes one file, which is its own; it never edits their source.

- [ ] **Step 2: Add the template to `report-format.md`**

````markdown
## `HANDOFF.md` template

```markdown
# Handoff notes

Written by Vet on <date>, against commit <short-sha> on branch <branch>.
If the code has changed since, re-run `/vet` to refresh this file.

## What this is meant to do
<the intent argument if one was given; otherwise:>
Not recorded — no description was given when this was generated.

## What is real, and what is not
<one bullet per finding from "Nothing pretends to be finished", naming the
file and what is stubbed. If the check passed:>
Everything on screen appears to come from a real source.

## What it needs to run
<required environment variables from the secrets check, by name only, never
values; plus any missing packages or files from "Everything it needs is
actually here". If both passed:>
Nothing missing — a fresh clone should install and run.

## What is known-broken
<any mechanical row that failed, quoted plainly: "The code compiles — failing".
If none failed or none ran:>
Nothing known-broken at the time of writing.

## What the person actually tried
<their answer, verbatim; otherwise:>
Not recorded.

## What Vet did not check
Vet checks how this was built, not whether it does what was asked for. It also
does not check visual design, mobile layout, or performance.
```

Every section is always present. An empty section says so in words rather than
being omitted — a missing heading reads as "not applicable", while "Not
recorded." correctly reads as "nobody knows".
````

- [ ] **Step 3: Restate the audit-only rule**

In `SKILL.md`'s opening section and Rules list, replace "audit only — never edits" with: *"Vet writes one file, which is its own — `HANDOFF.md`, plus `.vet/` scratch. It never edits the person's source, never commits, never pushes, never installs."*

- [ ] **Step 4: Verify live**

```bash
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
cd ~/vet-scratch
claude --allowedTools "Read Glob Grep Agent AskUserQuestion Write Bash(git *)" \
  -p "Use the vet skill to check this project. Follow its SKILL.md exactly."
cat HANDOFF.md
```

**Expected:** Vet asks the single what-did-you-try question; `HANDOFF.md` appears at the project root carrying all six headings; it records the commit; the "what the person actually tried" section says `Not recorded.` when unanswered; and `git status` shows the file **untracked** — Vet did not stage or commit it.

- [ ] **Step 5: Commit**

```bash
cd ~/phantom/vet
git add -A
git commit -m "Write HANDOFF.md, the artifact the receiving AI reads

The chat report evaporates -- the engineer's AI, the audience this
design is built around, never sees it. /vet now writes HANDOFF.md
carrying what the receiver cannot reconstruct: what is real vs stubbed,
what it needs to run, what is known-broken, and what the person
actually exercised.

That last item exists nowhere in the code, so it becomes the single
question Vet asks; declining records 'Not recorded' rather than
implying verification. Stale notes mislead with authority, so the file
records its commit and is rewritten when stale.

Restates the audit-only promise rather than quietly breaking it: Vet
writes one file, which is its own."
```

---

### Task 6: Update the user-facing documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/writing-a-check.md`
- Modify: `.claude-plugin/plugin.json` — version `0.1.0` → `0.2.0`

- [ ] **Step 1: Rewrite `README.md`'s "What it checks today"**

Replace the three old bullets with the six current rows — three mechanical (`The code compiles`, `The project's tests pass`, `The project's linter passes`) and three dispatched (`Everything it needs is actually here`, `No private keys or config left in the code`, `Nothing pretends to be finished`), one plain sentence each.

- [ ] **Step 2: Correct README's promises**

Two claims are now false and must change:

- "never edits your files, never commits, never installs anything" → state that Vet writes `HANDOFF.md` and nothing else, and that committing it is the reader's choice.
- Add a "What it does not check" line naming the JS/TS-only limitation.

- [ ] **Step 3: Add the handoff artifact to the README**

A short section: what `HANDOFF.md` is, that it is meant to be committed alongside the work, and that the engineer's AI should read it first.

- [ ] **Step 4: Update `docs/writing-a-check.md`**

- Replace the `TeamList.tsx` example, which referenced the retired `no-fake-data` check, with the current `pretends-finished` fixture pair.
- Add the labelled-stub principle: a check should distinguish *dishonest* from *unfinished*, and prefer requiring a label over banning a pattern.
- Update the fixture-path references from `broken-ui/` to the three new fixture directories.

- [ ] **Step 5: Bump the plugin version**

```json
"version": "0.2.0"
```

Note in the commit that `plugin update` only refreshes an installed copy when this changes.

- [ ] **Step 6: Verify a clean install end to end**

```bash
cd ~/phantom/vet
claude plugin validate .
claude plugin uninstall vet@vet-tools && claude plugin install vet@vet-tools
claude plugin list | grep vet    # expect 0.2.0
grep -rn "accessibility\|loading state\|no-fake-data" README.md docs/ || echo "no stale references ✓"
```

**Expected:** validation passes, version reads `0.2.0`, and no documentation still describes the retired checks.

- [ ] **Step 7: Commit and push**

```bash
git add -A
git commit -m "Docs: describe the handoff-integrity check set

Updates README's check list, corrects the now-false 'never writes
anything' promise, documents HANDOFF.md and the JS/TS-only limitation,
and refreshes writing-a-check.md's examples onto the new fixtures.
Bumps to 0.2.0 so installed copies actually refresh."
git push
```

---

## Verification summary

| Task | Live run proves |
|---|---|
| 1 | One row; trips on the unlabelled stub; **passes** the labelled one |
| 2 | Names the undeclared package and missing file; **not** the present ones |
| 3 | Names the hardcoded key; echoes no full value; says rotate |
| 4 | Guard refuses a non-JS project; rows render only when their source resolves |
| 5 | `HANDOFF.md` written, six headings, records commit, left untracked |
| 6 | Clean install at 0.2.0, no stale docs |

## Gaps this plan does not close

Carried from the spec, deliberately:

1. **Nothing triggers Vet.** Accepted with the skill-only decision.
2. **Secrets already in git history.** Task 3 inspects the working tree only, so a `.env` committed and later deleted still reports clean. Closing it costs one `git log --diff-filter=A` over `.env`-shaped paths — a good follow-up.
3. **Nothing verifies a fix landed.** A green second run remains indistinguishable from a suppression.
