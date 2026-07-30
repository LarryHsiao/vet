export function loadStoredSessions(raw: string): { id: string }[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // corrupt-data path — tested below, unlike useLiveSessions.ts's siblings.
    return [];
  }
}

export function stripForStorage(session: { id: string; token: string }) {
  const { token, ...rest } = session;
  return rest;
}
