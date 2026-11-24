import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";
import { checkEcoCashPayment, ecocashPaymentMethod, isPaynowPollUrl, readTicket } from "@/lib/ecocash";

export const runtime = "nodejs";

/** Checks the EcoCash payment; once paid, records the sale exactly once. */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const { ticket: token } = (await request.json()) as { ticket?: string };
    const ticket = readTicket(String(token ?? ""));
    if (!ticket || ticket.userId !== user.id || !isPaynowPollUrl(ticket.pollUrl)) {
      return Response.json({ message: "This payment could not be verified." }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const paymentMethod = ecocashPaymentMethod(ticket.reference);
    const existing = await db.from("sales").select("id").eq("organization_id", ticket.organizationId).eq("payment_method", paymentMethod).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return Response.json({ state: "paid", message: "EcoCash payment received. Sale completed." });

    const payment = await checkEcoCashPayment(new URL(request.url).origin, ticket.pollUrl);
    if (payment.state === "failed") return Response.json({ state: "failed", message: `EcoCash payment ${payment.rawStatus.toLowerCase()}. No sale was recorded.` });
    if (payment.state === "pending") {
      if (Date.now() > ticket.expiresAt) return Response.json({ state: "failed", message: "The EcoCash prompt expired. Try again." });
      return Response.json({ state: "pending", message: "Waiting for the customer to enter their EcoCash PIN..." });
    }
    if (payment.amount + 0.001 < ticket.total) {
      return Response.json({ state: "failed", message: `Paynow reports $${payment.amount.toFixed(2)} paid, less than the $${ticket.total.toFixed(2)} due. No sale was recorded.` });
    }

    const { error } = await db.rpc("record_sale", {
      p_organization_id: ticket.organizationId,
      p_shop_id: ticket.shopId,
      p_recorded_by: ticket.userId,
      p_customer_name: ticket.customerName,
      p_payment_method: paymentMethod,
      p_items: ticket.items,
    });
    if (error) {
      return Response.json({ state: "paid_unrecorded", message: `EcoCash payment ${payment.paynowReference || ticket.reference} was received, but the sale could not be saved (${error.message}). Record it manually as EcoCash.` }, { status: 409 });
    }
    return Response.json({ state: "paid", message: `EcoCash payment received (Paynow ref ${payment.paynowReference || ticket.reference}). Sale completed.` });
  } catch (error) {
    return apiError(error);
  }
}
