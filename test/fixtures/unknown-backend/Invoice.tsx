export async function loadInvoices() {
  const res = await fetch("https://api.acme-billing-service.io/v1/invoices");
  return res.json();
}
