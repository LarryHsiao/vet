# Fixtures: everything it needs is actually here

Deliberately incomplete. Not built, imported, or shipped.

| Import in `src/App.tsx` | Must trip? | Why |
|---|---|---|
| `date-fns` | **Yes** | Imported but absent from `package.json` — a fresh install will not have it. |
| `./Sidebar` | **Yes** | Imported but the file does not exist. |
| `./Header` | **No** | Imported and present. Flagging it means the check is not resolving relative paths. |
| `react` | **No** | Imported and declared. |

Note `Sidebar.tsx` is *absent by design*. Do not create it to "fix" the fixture.
