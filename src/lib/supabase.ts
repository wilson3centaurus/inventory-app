import { createClient } from "@supabase/supabase-js";

type AppSchema = "sokoflow_inventory";
type DatabaseShape = Record<string, never>;

function initializeClient(url: string, anonKey: string, schema: AppSchema) {
  return createClient<DatabaseShape, AppSchema>(url, anonKey, {
    db: { schema },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let browserClient: ReturnType<typeof initializeClient> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const schema = (process.env.NEXT_PUBLIC_SUPABASE_SCHEMA ?? "sokoflow_inventory") as AppSchema;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase browser environment variables.");
  }

  browserClient = initializeClient(url, anonKey, schema);

  return browserClient;
}
