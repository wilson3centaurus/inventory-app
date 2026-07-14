-- =============================================================================
-- SokoFlow Inventory PWA
-- Target: Shared self-hosted Supabase VPS
-- Schema: sokoflow_inventory
-- Read: robocore-docs/SHARED_DB_RULES.md before running
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS sokoflow_inventory;

GRANT USAGE ON SCHEMA sokoflow_inventory TO anon, authenticated, service_role;

CREATE TYPE sokoflow_inventory.user_role AS ENUM ('OWNER', 'EMPLOYEE');
CREATE TYPE sokoflow_inventory.movement_type AS ENUM (
  'INCOMING',
  'OUTGOING',
  'SALE',
  'DAMAGE',
  'RETURN',
  'ADJUSTMENT'
);
CREATE TYPE sokoflow_inventory.report_type AS ENUM (
  'DAILY_SALES',
  'WEEKLY_SALES',
  'MONTHLY_SALES',
  'STOCK_REPORT',
  'PROFIT_REPORT',
  'FAST_MOVERS',
  'SLOW_MOVERS'
);
CREATE TYPE sokoflow_inventory.sync_status AS ENUM ('PENDING', 'SYNCED', 'FAILED');

CREATE TABLE sokoflow_inventory.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  currency_code TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sokoflow_inventory.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role sokoflow_inventory.user_role NOT NULL DEFAULT 'EMPLOYEE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sokoflow_inventory.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  location TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE sokoflow_inventory.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE sokoflow_inventory.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sokoflow_inventory.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES sokoflow_inventory.product_categories(id),
  supplier_id UUID REFERENCES sokoflow_inventory.suppliers(id),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  image_url TEXT,
  unit_label TEXT NOT NULL DEFAULT 'item',
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, sku)
);

CREATE TABLE sokoflow_inventory.stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES sokoflow_inventory.shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES sokoflow_inventory.products(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  damaged_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  returned_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, product_id)
);

CREATE TABLE sokoflow_inventory.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES sokoflow_inventory.shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES sokoflow_inventory.products(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES sokoflow_inventory.profiles(id),
  movement_type sokoflow_inventory.movement_type NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  notes TEXT,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sokoflow_inventory.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES sokoflow_inventory.shops(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES sokoflow_inventory.profiles(id),
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE sokoflow_inventory.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sokoflow_inventory.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES sokoflow_inventory.products(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  cost_price NUMERIC(12, 2) NOT NULL
);

CREATE TABLE sokoflow_inventory.customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT,
  amount_owed NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sokoflow_inventory.restock_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES sokoflow_inventory.products(id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL,
  confidence_score NUMERIC(5, 2),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sokoflow_inventory.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  report_type sokoflow_inventory.report_type NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_path TEXT,
  created_by UUID REFERENCES sokoflow_inventory.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sokoflow_inventory.offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  sync_status sokoflow_inventory.sync_status NOT NULL DEFAULT 'PENDING',
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sokoflow_inventory.daily_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  backup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, backup_date)
);

CREATE TABLE sokoflow_inventory.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES sokoflow_inventory.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sokoflow_products_org ON sokoflow_inventory.products (organization_id);
CREATE INDEX idx_sokoflow_stock_movements_org ON sokoflow_inventory.stock_movements (organization_id, happened_at DESC);
CREATE INDEX idx_sokoflow_sales_org ON sokoflow_inventory.sales (organization_id, sold_at DESC);
CREATE INDEX idx_sokoflow_sync_queue_status ON sokoflow_inventory.offline_sync_queue (sync_status, created_at);

ALTER TABLE sokoflow_inventory.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.restock_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.offline_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.daily_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sokoflow_inventory.notifications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'organizations',
    'profiles',
    'shops',
    'product_categories',
    'suppliers',
    'products',
    'stock_balances',
    'stock_movements',
    'sales',
    'sale_items',
    'customer_credits',
    'restock_recommendations',
    'generated_reports',
    'offline_sync_queue',
    'daily_backups',
    'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "service_role_full_access" ON sokoflow_inventory.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "deny_anon" ON sokoflow_inventory.%I FOR ALL TO anon USING (false)',
      tbl
    );
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA sokoflow_inventory TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sokoflow_inventory TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA sokoflow_inventory TO authenticated;

DO $$
DECLARE
  v_current text;
  v_schema  text := 'sokoflow_inventory';
BEGIN
  SELECT split_part(cfg, '=', 2) INTO v_current
  FROM pg_roles, unnest(rolconfig) AS cfg
  WHERE rolname = 'authenticator'
    AND cfg LIKE 'pgrst.db_schemas=%';

  IF v_current IS NULL OR v_current = '' THEN
    v_current := 'public,storage,graphql_public,robocore,robokorda,aura,smartschools,azim_motors,icecream_erp';
  END IF;

  IF position(v_schema IN v_current) = 0 THEN
    EXECUTE format(
      'ALTER ROLE authenticator SET "pgrst.db_schemas" TO %L',
      v_current || ',' || v_schema
    );
    RAISE NOTICE 'pgrst.db_schemas updated to: %', v_current || ',' || v_schema;
    NOTIFY pgrst;
  ELSE
    RAISE NOTICE 'Schema % already present - no change needed', v_schema;
  END IF;
END $$;
