import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";
import { getProfile } from "@/lib/workspace-data";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const profile = await getProfile(user.id);
    const body = (await request.json()) as { customerName?: string; paymentMethod?: string; items?: Array<{ productId: string; quantity: number }> };
    if (!body.items?.length) return Response.json({ message: "Add at least one item to the sale." }, { status: 400 });

    const { data, error } = await getSupabaseAdmin().rpc("record_sale", {
      p_organization_id: profile.organization_id,
      p_shop_id: profile.shop_id,
      p_recorded_by: user.id,
      p_customer_name: body.customerName?.trim() || "Walk-in",
      p_payment_method: body.paymentMethod?.toLowerCase() || "cash",
      p_items: body.items,
    });
    if (error) throw error;
    return Response.json({ saleId: data, message: "Sale completed and stock updated." }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
