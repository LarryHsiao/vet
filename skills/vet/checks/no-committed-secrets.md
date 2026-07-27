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
