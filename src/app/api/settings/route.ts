import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";
import { getProfile } from "@/lib/workspace-data";
import { isValidLogoDataUrl } from "@/lib/logo";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      logoUrl?: string | null;
      enableAutoSave?: boolean;
      language?: string;
    };
    const reportEmail = body.reportEmail?.trim().toLowerCase() ?? "";
    if (reportEmail && !EMAIL_PATTERN.test(reportEmail)) return Response.json({ message: "Enter a valid email address for reports." }, { status: 400 });
    const logoUrl = body.logoUrl === undefined ? undefined : (body.logoUrl ?? "").trim();
    if (logoUrl && !isValidLogoDataUrl(logoUrl)) return Response.json({ message: "The logo must be a PNG, JPG or WebP image under 300 KB." }, { status: 400 });
    const db = getSupabaseAdmin();
    const organizationId = String(profile.organization_id);
    const shopId = String(profile.shop_id ?? "");
    const { error } = await db.from("organizations").update({
      app_name: body.appName?.trim() || "StockFlow",
      name: body.companyName?.trim(),
      report_email: reportEmail || "tafadzwawilsonsedze@gmail.com",
      ...(logoUrl !== undefined ? { logo_url: logoUrl || null } : {}),
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
