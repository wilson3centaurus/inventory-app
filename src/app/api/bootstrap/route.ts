import { apiError, getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { count, error } = await getSupabaseAdmin().from("profiles").select("id", { count: "exact", head: true });
    if (error) throw error;
    return Response.json({ needsSetup: count === 0 });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  let userId: string | undefined;
  let organizationId: string | undefined;

  try {
    const { count, error: countError } = await db.from("profiles").select("id", { count: "exact", head: true });
    if (countError) throw countError;
    if (count !== 0) return Response.json({ message: "Workspace setup is already complete." }, { status: 409 });

    const body = (await request.json()) as { fullName?: string; companyName?: string; email?: string; password?: string };
    if (!body.fullName?.trim() || !body.companyName?.trim() || !body.email?.trim() || (body.password?.length ?? 0) < 8) {
      return Response.json({ message: "Complete every field and use at least 8 password characters." }, { status: 400 });
    }

    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName.trim() },
    });
    if (authError || !authData.user) throw authError ?? new Error("Could not create owner account.");
    userId = authData.user.id;

    const { data: organization, error: organizationError } = await db.from("organizations").insert({
      name: body.companyName.trim(),
      app_name: "StockFlow",
      report_email: "tafadzwawilsonsedze@gmail.com",
    }).select("id").single();
    if (organizationError || !organization) throw organizationError ?? new Error("Could not create organization.");
    organizationId = String(organization.id);

    const { data: shop, error: shopError } = await db.from("shops").insert({
      organization_id: organizationId,
      name: "Main shop",
      code: "MAIN",
      is_primary: true,
    }).select("id").single();
    if (shopError || !shop) throw shopError ?? new Error("Could not create shop.");

    const { error: profileError } = await db.from("profiles").insert({
      id: userId,
      organization_id: organizationId,
      shop_id: shop.id,
      full_name: body.fullName.trim(),
      role: "OWNER",
      job_title: "Business owner",
    });
    if (profileError) throw profileError;

    return Response.json({ message: "Workspace created. You can now sign in." }, { status: 201 });
  } catch (error) {
    if (organizationId) await db.from("organizations").delete().eq("id", organizationId);
    if (userId) await db.auth.admin.deleteUser(userId);
    return apiError(error);
  }
}
