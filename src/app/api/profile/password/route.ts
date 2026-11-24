import { createClient } from "@supabase/supabase-js";
import { apiError, getSupabaseAdmin, requireApiUser } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const authUser = await requireApiUser(request);
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    if (!currentPassword) return Response.json({ message: "Enter your current password." }, { status: 400 });
    if (newPassword.length < 8) return Response.json({ message: "The new password must be at least 8 characters." }, { status: 400 });
    if (newPassword === currentPassword) return Response.json({ message: "Choose a password that is different from the current one." }, { status: 400 });
    if (!authUser.email) return Response.json({ message: "This account has no sign-in email." }, { status: 400 });

    // Confirm the current password with a throwaway, non-persistent client.
    const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const check = await verifier.auth.signInWithPassword({ email: authUser.email, password: currentPassword });
    if (check.error || !check.data.user || check.data.user.id !== authUser.id) {
      return Response.json({ message: "Your current password is incorrect." }, { status: 400 });
    }
    await verifier.auth.signOut({ scope: "local" });

    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(authUser.id, { password: newPassword });
    if (error) throw error;
    return Response.json({ message: "Password changed. Use the new password next time you sign in." });
  } catch (error) {
    return apiError(error);
  }
}
