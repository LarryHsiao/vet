export async function trackEvent(event: string) {
  return fetch("https://api.acme.io/v1/events", {
    method: "POST",
    body: JSON.stringify({ event }),
  });
}
