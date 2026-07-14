import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";
import { getProfile } from "@/lib/workspace-data";

export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  let newUserId: string | undefined;
  try {
    const user = await requireApiUser(request);
    const profile = await getProfile(user.id);
    if (profile.role !== "OWNER") throw new Error("FORBIDDEN");
    const body = (await request.json()) as { fullName?: string; email?: string; password?: string; title?: string; role?: string };
    if (!body.fullName?.trim() || !body.email?.trim() || (body.password?.length ?? 0) < 8) return Response.json({ message: "Name, email and an 8-character temporary password are required." }, { status: 400 });

    const auth = await db.auth.admin.createUser({ email: body.email.trim(), password: body.password, email_confirm: true, user_metadata: { full_name: body.fullName.trim() } });
    if (auth.error || !auth.data.user) throw auth.error ?? new Error("Could not create employee login.");
    newUserId = auth.data.user.id;
    const insert = await db.from("profiles").insert({
      id: newUserId,
      organization_id: profile.organization_id,
      shop_id: profile.shop_id,
      full_name: body.fullName.trim(),
      role: body.role === "OWNER" ? "OWNER" : "EMPLOYEE",
      job_title: body.title?.trim() || "Team member",
    });
    if (insert.error) throw insert.error;
    return Response.json({ message: "Employee account is ready to sign in." }, { status: 201 });
  } catch (error) {
    if (newUserId) await db.auth.admin.deleteUser(newUserId);
    return apiError(error);
  }
}
