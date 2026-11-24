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

/** Owner sets a new password for someone in their own workspace. */
export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser(request);
    const profile = await getProfile(user.id);
    if (profile.role !== "OWNER") throw new Error("FORBIDDEN");
    const body = (await request.json()) as { userId?: string; password?: string };
    const userId = String(body.userId ?? "");
    if (!userId || (body.password?.length ?? 0) < 8) return Response.json({ message: "Choose a team member and a password of at least 8 characters." }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: member, error: memberError } = await db.from("profiles").select("id, full_name").eq("id", userId).eq("organization_id", String(profile.organization_id)).maybeSingle();
    if (memberError) throw memberError;
    if (!member) throw new Error("FORBIDDEN");

    const { error } = await db.auth.admin.updateUserById(userId, { password: body.password });
    if (error) throw error;
    return Response.json({ message: `New password set for ${String((member as { full_name?: string }).full_name ?? "team member")}.` });
  } catch (error) {
    return apiError(error);
  }
}
