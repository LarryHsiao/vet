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
