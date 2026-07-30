package session

import "fmt"

type LiveSessionController struct {
	Status    string
	LastError string
}

func (c *LiveSessionController) RunLive(sessionID string) (string, error) {
	c.Status = "live"
	result, err := interpretTurn(sessionID)
	if err != nil {
		// interpret-failure path — no test exercises this branch.
		c.Status = "error"
		c.LastError = err.Error()
		return "", err
	}
	c.Status = "idle"
	return result, nil
}

func (c *LiveSessionController) OnRefineTurn(sessionID, note string) (string, error) {
	refined, err := refineTurn(sessionID, note)
	if err != nil {
		// error path — no test exercises this branch either.
		c.LastError = err.Error()
		return "", err
	}
	return refined, nil
}

func interpretTurn(sessionID string) (string, error) {
	return fmt.Sprintf("interpreted-%s", sessionID), nil
}

func refineTurn(sessionID, note string) (string, error) {
	return fmt.Sprintf("refined-%s", sessionID), nil
}
