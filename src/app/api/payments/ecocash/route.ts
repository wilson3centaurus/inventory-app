import crypto from "crypto";
import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";
import { getProfile } from "@/lib/workspace-data";
import { ecocashConfigured, isPaynowPollUrl, normaliseEcoCashPhone, signTicket, startEcoCashPayment } from "@/lib/ecocash";

export const runtime = "nodejs";

/** Sends an EcoCash PIN prompt to the customer's phone for the basket total. */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const profile = await getProfile(user.id);
    if (!ecocashConfigured()) return Response.json({ message: "EcoCash is not set up yet. Add the Paynow integration ID and key." }, { status: 503 });

    const body = (await request.json()) as { phone?: string; customerName?: string; items?: Array<{ productId: string; quantity: number }> };
    const phone = normaliseEcoCashPhone(String(body.phone ?? ""));
    if (!phone) return Response.json({ message: "Enter a valid EcoCash number, e.g. 0771234567." }, { status: 400 });
    const items = (body.items ?? [])
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({ productId: String(item.productId), quantity: Number(item.quantity) }));
    if (!items.length) return Response.json({ message: "Add at least one item to the sale." }, { status: 400 });

    // Price the basket from the database, never from the browser.
    const organizationId = String(profile.organization_id);
    const { data: products, error } = await getSupabaseAdmin()
      .from("products")
      .select("id, name, selling_price")
      .eq("organization_id", organizationId)
      .in("id", items.map((item) => item.productId));
    if (error) throw error;
    const rows = (products ?? []) as Array<{ id: string; name: string; selling_price: number }>;
    let total = 0;
    for (const item of items) {
      const product = rows.find((entry) => entry.id === item.productId);
      if (!product) return Response.json({ message: "A product in the basket is no longer available." }, { status: 409 });
      total += Number(product.selling_price) * item.quantity;
    }
    total = Math.round(total * 100) / 100;
    if (total <= 0) return Response.json({ message: "The sale total must be more than $0.00." }, { status: 400 });

    const origin = new URL(request.url).origin;
    const reference = `SF-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const authEmail = process.env.PAYNOW_AUTH_EMAIL || user.email || "payments@stockflow.app";
    const result = await startEcoCashPayment({ origin, reference, authEmail, phone, amount: total, description: `StockFlow sale ${reference}` });
    if (!result.success || !result.pollUrl || !isPaynowPollUrl(result.pollUrl)) {
      return Response.json({ message: `EcoCash could not start the payment${result.error ? `: ${result.error}` : "."}` }, { status: 502 });
    }

    const ticket = signTicket({
      reference,
      pollUrl: result.pollUrl,
      organizationId,
      shopId: profile.shop_id ? String(profile.shop_id) : null,
      userId: user.id,
      customerName: body.customerName?.trim() || "Walk-in",
      phone,
      items,
      total,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return Response.json({ ticket, reference, total, message: `EcoCash prompt sent to ${phone}. Ask the customer to enter their PIN.` });
  } catch (error) {
    return apiError(error);
  }
}
