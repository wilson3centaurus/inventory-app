// Paynow posts status updates here. Sales are confirmed by polling, so this only acknowledges.
export async function POST() {
  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}
