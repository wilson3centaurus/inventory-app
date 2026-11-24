-- Shop logo shown in the sidebar and header. Stored as a small, client-resized
-- image data URL so it does not depend on Supabase Storage.
ALTER TABLE sokoflow_inventory.organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
