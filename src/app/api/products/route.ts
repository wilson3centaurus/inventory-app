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

/** Edit product details and/or adjust stock for the user's shop. */
export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser(request);
    const profile = await getProfile(user.id);
    const body = (await request.json()) as {
      id?: string; name?: string; barcode?: string; costPrice?: number; sellingPrice?: number;
      minStock?: number; expiryDate?: string | null; stockChange?: number; reason?: "RESTOCK" | "DAMAGE" | "COUNT";
    };
    const db = getSupabaseAdmin();
    const organizationId = String(profile.organization_id);
    const shopId = String(profile.shop_id ?? "");
    const productId = String(body.id ?? "");
    const { data: product, error: productError } = await db.from("products").select("id").eq("id", productId).eq("organization_id", organizationId).maybeSingle();
    if (productError) throw productError;
    if (!product) return Response.json({ message: "That product is no longer available." }, { status: 404 });

    const numbers = [body.costPrice, body.sellingPrice, body.minStock].filter((value) => value !== undefined).map(Number);
    if (numbers.some((value) => !Number.isFinite(value) || value < 0)) return Response.json({ message: "Prices and low-stock level cannot be negative." }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) {
      if (!body.name.trim()) return Response.json({ message: "Product name is required." }, { status: 400 });
      updates.name = body.name.trim();
    }
    if (body.barcode !== undefined) updates.barcode = body.barcode.trim() || null;
    if (body.costPrice !== undefined) updates.cost_price = Number(body.costPrice);
    if (body.sellingPrice !== undefined) updates.selling_price = Number(body.sellingPrice);
    if (body.minStock !== undefined) updates.minimum_stock = Number(body.minStock);
    if (body.expiryDate !== undefined) updates.expiry_date = body.expiryDate || null;
    const { error: updateError } = await db.from("products").update(updates).eq("id", productId).eq("organization_id", organizationId);
    if (updateError) throw updateError;

    const change = Number(body.stockChange ?? 0);
    if (!Number.isFinite(change)) return Response.json({ message: "Enter a valid stock quantity." }, { status: 400 });
    if (change !== 0) {
      if (!shopId) return Response.json({ message: "Your profile has no shop assigned." }, { status: 400 });
      // Optimistic concurrency: retry if a sale changes the balance at the same moment.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data: balance, error: balanceError } = await db.from("stock_balances").select("id, quantity").eq("shop_id", shopId).eq("product_id", productId).maybeSingle();
        if (balanceError) throw balanceError;
        const current = Number((balance as { quantity?: number } | null)?.quantity ?? 0);
        const next = current + change;
        if (next < 0) return Response.json({ message: `Only ${current} in stock, so you cannot remove ${Math.abs(change)}.` }, { status: 409 });
        if (balance) {
          const { data: updated, error } = await db.from("stock_balances").update({ quantity: next, updated_at: new Date().toISOString() }).eq("id", (balance as { id: string }).id).eq("quantity", current).select("id");
          if (error) throw error;
          if (!updated?.length) continue;
        } else {
          const { error } = await db.from("stock_balances").insert({ organization_id: organizationId, shop_id: shopId, product_id: productId, quantity: next });
          if (error) throw error;
        }
        const movementType = change > 0 ? "INCOMING" : body.reason === "DAMAGE" ? "DAMAGE" : "ADJUSTMENT";
        const notes = change > 0 ? "Restock" : body.reason === "DAMAGE" ? "Damaged or expired" : "Stock count correction";
        const { error: movementError } = await db.from("stock_movements").insert({ organization_id: organizationId, shop_id: shopId, product_id: productId, recorded_by: user.id, movement_type: movementType, quantity: Math.abs(change), notes });
        if (movementError) throw movementError;
        return Response.json({ message: change > 0 ? `Added ${change} to stock. New balance: ${next}.` : `Removed ${Math.abs(change)} from stock. New balance: ${next}.` });
      }
      return Response.json({ message: "Stock changed while saving. Please try again." }, { status: 409 });
    }
    return Response.json({ message: "Product updated." });
  } catch (error) {
    return apiError(error);
  }
}
