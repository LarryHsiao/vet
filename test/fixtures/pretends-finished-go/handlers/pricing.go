package handlers

import (
	"encoding/json"
	"net/http"
)

type plan struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Saved string `json:"saved"`
}

func Pricing(w http.ResponseWriter, r *http.Request) {
	plans := []plan{
		{ID: "starter", Name: "Starter", Price: 19, Saved: "+12% this month"},
		{ID: "team", Name: "Team", Price: 49, Saved: "+31% this month"},
	}
	json.NewEncoder(w).Encode(plans)
}
