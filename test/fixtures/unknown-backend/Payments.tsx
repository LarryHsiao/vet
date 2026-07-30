export async function loadPaymentMethods(customerId: string) {
  const res = await fetch(
    `https://api.stripe.com/v1/customers/${customerId}/payment_methods`,
  );
  return res.json();
}
