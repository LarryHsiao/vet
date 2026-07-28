const KEY = process.env.STRIPE_SECRET_KEY;

export async function charge(cents: number) {
  return fetch("https://api.stripe.com/v1/charges", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: String(cents),
  });
}
