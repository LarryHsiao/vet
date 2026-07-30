import { useState } from "react";
import { interpretTurn, refineTurn } from "./aiClient";

export function useLiveSessions() {
  const [status, setStatus] = useState<"idle" | "live" | "error">("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  async function runLive(sessionId: string) {
    setStatus("live");
    try {
      const result = await interpretTurn(sessionId);
      setStatus("idle");
      return result;
    } catch (err) {
      // interpret-failure path — no test exercises this branch.
      setStatus("error");
      setLastError(err instanceof Error ? err.message : "unknown error");
      return null;
    }
  }

  async function onRefineTurn(sessionId: string, note: string) {
    const refined = await refineTurn(sessionId, note);
    if (!refined.ok) {
      // error path — no test exercises this branch either.
      setLastError(refined.reason);
      return null;
    }
    return refined.turn;
  }

  return { status, lastError, runLive, onRefineTurn };
}
