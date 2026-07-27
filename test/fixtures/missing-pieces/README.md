# Fixtures: everything it needs is actually here

Deliberately incomplete. Not built, imported, or shipped.

| Import in `src/App.tsx` | Must trip? | Why |
|---|---|---|
| `date-fns` | **Yes** | Imported but absent from `package.json` — a fresh install will not have it. |
| `./Sidebar` | **Yes** | Imported but the file does not exist. |
| `./styles/missing.css` | **Yes** | An ordinary asset import pointing at a stylesheet that does not exist — the asset-existence check must catch this exactly like a missing component. |
| `./Header` | **No** | Imported and present. Flagging it means the check is not resolving relative paths. |
| `react` | **No** | Imported and declared. |
| `./styles/app.css` | **No** | An ordinary asset import that does resolve — `src/styles/app.css` exists. The negative control proving real assets aren't swept up by the missing-stylesheet case above. |
| `./notes.txt?raw` | **No** | Bundler-special `?raw` suffix — exempt regardless of whether `notes.txt` exists (it does not). Proves the carve-out for bundler query syntax still holds after the asset-existence tightening. |

Note `Sidebar.tsx` and `styles/missing.css` are *absent by design*. Do not create either to "fix" the fixture. `notes.txt` is likewise never created — its absence is what proves the `?raw` carve-out, not a gap to fill.
