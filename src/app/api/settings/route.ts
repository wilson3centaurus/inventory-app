import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";
import { getProfile } from "@/lib/workspace-data";

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser(request);
    const profile = await getProfile(user.id);
    if (profile.role !== "OWNER") throw new Error("FORBIDDEN");
    const body = (await request.json()) as {
      appName?: string;
      companyName?: string;
      shopName?: string;
      shopCode?: string;
      shopLocation?: string;
      reportEmail?: string;
      enableAutoSave?: boolean;
      language?: string;
    };
    const db = getSupabaseAdmin();
    const organizationId = String(profile.organization_id);
    const shopId = String(profile.shop_id ?? "");
    const { error } = await db.from("organizations").update({
      app_name: body.appName?.trim() || "StockFlow",
      name: body.companyName?.trim(),
      report_email: body.reportEmail?.trim() || "tafadzwawilsonsedze@gmail.com",
      enable_auto_save: body.enableAutoSave ?? true,
      preferred_language: body.language === "sn" ? "sn" : "en",
      updated_at: new Date().toISOString(),
    }).eq("id", organizationId);
    if (error) throw error;
    if (shopId) {
      const { error: shopError } = await db.from("shops").update({
        name: body.shopName?.trim() || "Main shop",
        code: body.shopCode?.trim().toUpperCase() || "MAIN",
        location: body.shopLocation?.trim() || null,
      }).eq("id", shopId).eq("organization_id", organizationId);
      if (shopError) throw shopError;
    }
    return Response.json({ message: "Workspace settings saved." });
  } catch (error) {
    return apiError(error);
  }
}
