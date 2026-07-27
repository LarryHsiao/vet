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
