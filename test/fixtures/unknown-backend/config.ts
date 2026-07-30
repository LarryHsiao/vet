export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://api.acme.com";

export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE}${path}`, init);
}
