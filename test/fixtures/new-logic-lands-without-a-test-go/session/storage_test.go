package session

import "testing"

func TestLoadStoredSessionsParsesAValidArray(t *testing.T) {
	sessions := LoadStoredSessions(`[{"id":"a"}]`)
	expectedLength := 1
	if len(sessions) != expectedLength {
		t.Errorf("got %d sessions, want %d", len(sessions), expectedLength)
	}
}

func TestLoadStoredSessionsReturnsEmptyOnCorruptData(t *testing.T) {
	sessions := LoadStoredSessions("not-json")
	expectedLength := 0
	if len(sessions) != expectedLength {
		t.Errorf("got %d sessions, want %d", len(sessions), expectedLength)
	}
}

func TestStripForStorageRemovesTokenField(t *testing.T) {
	result := StripForStorage(map[string]string{"id": "a", "token": "secret"})
	expectedLength := 1
	if len(result) != expectedLength || result["id"] != "a" {
		t.Errorf("got %v, want map with only id=a", result)
	}
}
