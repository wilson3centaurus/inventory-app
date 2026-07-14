import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";
import { getProfile } from "@/lib/workspace-data";

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser(request);
    const profile = await getProfile(user.id);
    if (profile.role !== "OWNER") throw new Error("FORBIDDEN");
    const body = (await request.json()) as { appName?: string; companyName?: string; reportEmail?: string; enableAutoSave?: boolean; language?: string };
    const { error } = await getSupabaseAdmin().from("organizations").update({
      app_name: body.appName?.trim() || "StockFlow",
      name: body.companyName?.trim(),
      report_email: body.reportEmail?.trim() || "tafadzwawilsonsedze@gmail.com",
      enable_auto_save: body.enableAutoSave ?? true,
      preferred_language: body.language === "sn" ? "sn" : "en",
      updated_at: new Date().toISOString(),
    }).eq("id", String(profile.organization_id));
    if (error) throw error;
    return Response.json({ message: "Workspace settings saved." });
  } catch (error) {
    return apiError(error);
  }
}
