import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";
import { getProfile } from "@/lib/workspace-data";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const profile = await getProfile(user.id);
    const body = (await request.json()) as Record<string, string | number | undefined>;
    const name = String(body.name ?? "").trim();
    const sku = String(body.sku ?? "").trim();
    if (!name || !sku) return Response.json({ message: "Product name and SKU are required." }, { status: 400 });

    const { error } = await getSupabaseAdmin().rpc("create_product", {
      p_organization_id: profile.organization_id,
      p_shop_id: profile.shop_id,
      p_recorded_by: user.id,
      p_name: name,
      p_sku: sku,
      p_barcode: String(body.barcode ?? "").trim() || null,
      p_category: String(body.category ?? "").trim() || null,
      p_supplier: String(body.supplier ?? "").trim() || null,
      p_cost_price: Number(body.costPrice ?? 0),
      p_selling_price: Number(body.sellingPrice ?? 0),
      p_opening_stock: Number(body.stock ?? 0),
      p_minimum_stock: Number(body.minStock ?? 0),
      p_expiry_date: body.expiryDate ? String(body.expiryDate) : null,
    });
    if (error) throw error;
    return Response.json({ message: "Product added to live inventory." }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
