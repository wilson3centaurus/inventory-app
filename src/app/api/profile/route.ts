import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";
import { getProfile } from "@/lib/workspace-data";

export async function PATCH(request: Request) {
  try {
    const authUser = await requireApiUser(request);
    const profile = await getProfile(authUser.id);
    const db = getSupabaseAdmin();
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      title?: string;
      companyName?: string;
      shopName?: string;
      shopLocation?: string;
    };

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const title = String(body.title ?? "").trim();
    if (!fullName || !email) {
      return Response.json({ message: "Full name and email are required." }, { status: 400 });
    }

    const { error: authError } = await db.auth.admin.updateUserById(authUser.id, {
      email,
      user_metadata: { ...(authUser.user_metadata ?? {}), full_name: fullName },
    });
    if (authError) throw authError;

    const { error: profileError } = await db.from("profiles").update({
      full_name: fullName,
      job_title: title || "Business owner",
      updated_at: new Date().toISOString(),
    }).eq("id", authUser.id);
    if (profileError) throw profileError;

    if (profile.role === "OWNER") {
      const organizationId = String(profile.organization_id);
      const shopId = String(profile.shop_id ?? "");

      if (body.companyName?.trim()) {
        const { error: organizationError } = await db.from("organizations").update({
          name: body.companyName.trim(),
          updated_at: new Date().toISOString(),
        }).eq("id", organizationId);
        if (organizationError) throw organizationError;
      }

      if (shopId && (body.shopName?.trim() || body.shopLocation !== undefined)) {
        const { error: shopError } = await db.from("shops").update({
          ...(body.shopName?.trim() ? { name: body.shopName.trim() } : {}),
          location: body.shopLocation?.trim() || null,
        }).eq("id", shopId).eq("organization_id", organizationId);
        if (shopError) throw shopError;
      }
    }

    return Response.json({ message: "Profile updated successfully." });
  } catch (error) {
    return apiError(error);
  }
}
