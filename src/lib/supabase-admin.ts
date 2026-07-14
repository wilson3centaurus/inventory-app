import { createClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database-types";

const schema = "sokoflow_inventory" as const;

let adminClient: ReturnType<typeof createClient<Database, typeof schema>> | null = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase server environment variables.");

  adminClient = createClient<Database, typeof schema>(url, serviceKey, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export async function requireApiUser(request: Request): Promise<User> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("UNAUTHORIZED");

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected request failure.";
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  return Response.json({ message: status === 500 ? "The database request could not be completed." : message }, { status });
}
