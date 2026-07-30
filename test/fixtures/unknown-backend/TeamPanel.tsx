import { apiFetch } from "./config";

export async function loadTeam() {
  const res = await apiFetch("/v1/team");
  return res.json();
}
