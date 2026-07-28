# Fixtures: everything it needs is actually here (Go)

Deliberately incomplete. Not built, imported, or shipped.

| Import in `main.go` | Must trip? | Why |
|---|---|---|
| `github.com/google/uuid` | **Yes** | Imported but absent from `go.mod`'s `require` block — a fresh `go mod download` will not have it. |
| `missingpiecesfixture/internal/missing` | **Yes** | An internal import naming a package directory that does not exist. |
| `missingpiecesfixture/internal/greeting` | **No** | Internal, and the directory is present. Flagging it means the check is not resolving internal packages. |

Note `internal/missing/` is *absent by design*. Do not create it to "fix" the fixture.
