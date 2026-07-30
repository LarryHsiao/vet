package session

import "testing"

func TestRunLiveSetsStatusBackToIdleOnSuccess(t *testing.T) {
	controller := &LiveSessionController{}
	if _, err := controller.RunLive("session-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expectedStatus := "idle"
	if controller.Status != expectedStatus {
		t.Errorf("got status %q, want %q", controller.Status, expectedStatus)
	}
}

func TestOnRefineTurnReturnsRefinedTurnOnSuccess(t *testing.T) {
	controller := &LiveSessionController{}
	refined, err := controller.OnRefineTurn("session-1", "shorter")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expectedRefined := "refined-session-1"
	if refined != expectedRefined {
		t.Errorf("got %q, want %q", refined, expectedRefined)
	}
}
