import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database-types";

const schema = "sokoflow_inventory" as const;

let browserClient: ReturnType<typeof createClient<Database, typeof schema>> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) throw new Error("Missing Supabase browser environment variables.");

  browserClient = createClient<Database, typeof schema>(url, anonKey, {
    db: { schema },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  return browserClient;
}
