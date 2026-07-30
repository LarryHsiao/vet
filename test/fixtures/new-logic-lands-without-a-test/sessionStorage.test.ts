import { loadStoredSessions, stripForStorage } from "./sessionStorage";

test("loadStoredSessions parses a valid array", () => {
  const expected = [{ id: "a" }];
  expect(loadStoredSessions(JSON.stringify(expected))).toEqual(expected);
});

test("loadStoredSessions returns empty array on corrupt data", () => {
  const expected: { id: string }[] = [];
  expect(loadStoredSessions("{not json")).toEqual(expected);
});

test("stripForStorage removes the token field", () => {
  const expected = { id: "a" };
  expect(stripForStorage({ id: "a", token: "secret" })).toEqual(expected);
});
