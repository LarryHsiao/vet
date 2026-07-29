package handlers

import "net/http"

// Team is not wired to the real roster service yet.
func Team(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "team endpoint not implemented", http.StatusNotImplemented)
}
