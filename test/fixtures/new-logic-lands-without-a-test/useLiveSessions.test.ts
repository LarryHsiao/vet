import { renderHook, act } from "@testing-library/react";
import { useLiveSessions } from "./useLiveSessions";

test("runLive sets status back to idle on success", async () => {
  const { result } = renderHook(() => useLiveSessions());
  await act(async () => {
    await result.current.runLive("session-1");
  });
  const expectedStatus = "idle";
  expect(result.current.status).toBe(expectedStatus);
});

test("onRefineTurn returns the refined turn on success", async () => {
  const { result } = renderHook(() => useLiveSessions());
  let refined;
  await act(async () => {
    refined = await result.current.onRefineTurn("session-1", "shorter");
  });
  expect(refined).toBeDefined();
});
