package session

import "encoding/json"

type StoredSession struct {
	ID string `json:"id"`
}

func LoadStoredSessions(raw string) []StoredSession {
	var parsed []StoredSession
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		// corrupt-data path — tested below, unlike live_session.go's siblings.
		return []StoredSession{}
	}
	return parsed
}

func StripForStorage(session map[string]string) map[string]string {
	rest := make(map[string]string, len(session))
	for k, v := range session {
		if k == "token" {
			continue
		}
		rest[k] = v
	}
	return rest
}
