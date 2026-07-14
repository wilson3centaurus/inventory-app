-- StockFlow live-workspace upgrade. Run after 001_sokoflow_inventory.sql.
-- This migration is additive and does not touch any other project schema.

ALTER TABLE sokoflow_inventory.organizations
  ADD COLUMN IF NOT EXISTS app_name TEXT NOT NULL DEFAULT 'StockFlow',
  ADD COLUMN IF NOT EXISTS report_email TEXT NOT NULL DEFAULT 'tafadzwawilsonsedze@gmail.com',
  ADD COLUMN IF NOT EXISTS enable_auto_save BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE sokoflow_inventory.profiles
  ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES sokoflow_inventory.shops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT 'Team member';

CREATE OR REPLACE FUNCTION sokoflow_inventory.create_product(
  p_organization_id UUID,
  p_shop_id UUID,
  p_recorded_by UUID,
  p_name TEXT,
  p_sku TEXT,
  p_barcode TEXT,
  p_category TEXT,
  p_supplier TEXT,
  p_cost_price NUMERIC,
  p_selling_price NUMERIC,
  p_opening_stock NUMERIC,
  p_minimum_stock NUMERIC,
  p_expiry_date DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sokoflow_inventory, public
AS $$
DECLARE
  v_product_id UUID;
  v_category_id UUID;
  v_supplier_id UUID;
BEGIN
  IF trim(COALESCE(p_name, '')) = '' OR trim(COALESCE(p_sku, '')) = '' THEN
    RAISE EXCEPTION 'Product name and SKU are required';
  END IF;
  IF p_opening_stock < 0 OR p_cost_price < 0 OR p_selling_price < 0 OR p_minimum_stock < 0 THEN
    RAISE EXCEPTION 'Stock and prices cannot be negative';
  END IF;

  IF trim(COALESCE(p_category, '')) <> '' THEN
    INSERT INTO sokoflow_inventory.product_categories (organization_id, name)
    VALUES (p_organization_id, trim(p_category))
    ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_category_id;
  END IF;

  IF trim(COALESCE(p_supplier, '')) <> '' THEN
    SELECT id INTO v_supplier_id FROM sokoflow_inventory.suppliers
    WHERE organization_id = p_organization_id AND lower(name) = lower(trim(p_supplier)) LIMIT 1;
    IF v_supplier_id IS NULL THEN
      INSERT INTO sokoflow_inventory.suppliers (organization_id, name)
      VALUES (p_organization_id, trim(p_supplier)) RETURNING id INTO v_supplier_id;
    END IF;
  END IF;

  INSERT INTO sokoflow_inventory.products (
    organization_id, category_id, supplier_id, name, sku, barcode,
    cost_price, selling_price, minimum_stock, expiry_date
  ) VALUES (
    p_organization_id, v_category_id, v_supplier_id, trim(p_name), trim(p_sku),
    NULLIF(trim(COALESCE(p_barcode, '')), ''), p_cost_price, p_selling_price,
    p_minimum_stock, p_expiry_date
  ) RETURNING id INTO v_product_id;

  INSERT INTO sokoflow_inventory.stock_balances (
    organization_id, shop_id, product_id, quantity
  ) VALUES (p_organization_id, p_shop_id, v_product_id, p_opening_stock);

  IF p_opening_stock > 0 THEN
    INSERT INTO sokoflow_inventory.stock_movements (
      organization_id, shop_id, product_id, recorded_by, movement_type, quantity, notes
    ) VALUES (
      p_organization_id, p_shop_id, v_product_id, p_recorded_by,
      'INCOMING', p_opening_stock, 'Opening stock'
    );
  END IF;
  RETURN v_product_id;
END;
$$;

REVOKE ALL ON FUNCTION sokoflow_inventory.create_product(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION sokoflow_inventory.create_product(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, DATE) TO service_role;

CREATE OR REPLACE FUNCTION sokoflow_inventory.record_sale(
  p_organization_id UUID,
  p_shop_id UUID,
  p_recorded_by UUID,
  p_customer_name TEXT,
  p_payment_method TEXT,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sokoflow_inventory, public
AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_product sokoflow_inventory.products%ROWTYPE;
  v_quantity NUMERIC(12, 2);
  v_total NUMERIC(12, 2) := 0;
  v_profit NUMERIC(12, 2) := 0;
BEGIN
  IF p_recorded_by IS NULL OR p_organization_id IS NULL OR p_shop_id IS NULL THEN
    RAISE EXCEPTION 'Invalid sale context';
  END IF;

  INSERT INTO sokoflow_inventory.sales (
    organization_id, shop_id, recorded_by, customer_name, payment_method
  ) VALUES (
    p_organization_id, p_shop_id, p_recorded_by,
    COALESCE(NULLIF(trim(p_customer_name), ''), 'Walk-in'),
    COALESCE(NULLIF(trim(p_payment_method), ''), 'cash')
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::NUMERIC;
    IF v_quantity <= 0 THEN RAISE EXCEPTION 'Sale quantity must be positive'; END IF;

    SELECT * INTO v_product
    FROM sokoflow_inventory.products
    WHERE id = (v_item->>'productId')::UUID
      AND organization_id = p_organization_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;

    UPDATE sokoflow_inventory.stock_balances
    SET quantity = quantity - v_quantity, updated_at = now()
    WHERE organization_id = p_organization_id
      AND shop_id = p_shop_id
      AND product_id = v_product.id
      AND quantity >= v_quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for %', v_product.name; END IF;

    INSERT INTO sokoflow_inventory.sale_items (sale_id, product_id, quantity, unit_price, cost_price)
    VALUES (v_sale_id, v_product.id, v_quantity, v_product.selling_price, v_product.cost_price);

    INSERT INTO sokoflow_inventory.stock_movements (
      organization_id, shop_id, product_id, recorded_by, movement_type, quantity, notes
    ) VALUES (
      p_organization_id, p_shop_id, v_product.id, p_recorded_by, 'SALE', -v_quantity,
      'Sale ' || v_sale_id::TEXT
    );

    v_total := v_total + (v_quantity * v_product.selling_price);
    v_profit := v_profit + (v_quantity * (v_product.selling_price - v_product.cost_price));
  END LOOP;

  UPDATE sokoflow_inventory.sales
  SET total_amount = v_total, total_profit = v_profit
  WHERE id = v_sale_id;

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION sokoflow_inventory.record_sale(UUID, UUID, UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION sokoflow_inventory.record_sale(UUID, UUID, UUID, TEXT, TEXT, JSONB) TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA sokoflow_inventory TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA sokoflow_inventory TO service_role;

DO $$
DECLARE
  v_current TEXT;
  v_schema TEXT := 'sokoflow_inventory';
BEGIN
  SELECT split_part(cfg, '=', 2) INTO v_current
  FROM pg_roles, unnest(rolconfig) AS cfg
  WHERE rolname = 'authenticator' AND cfg LIKE 'pgrst.db_schemas=%';

  IF v_current IS NULL OR v_current = '' THEN
    RAISE EXCEPTION 'pgrst.db_schemas is empty; stop and inspect shared-server configuration';
  END IF;

  IF NOT (v_schema = ANY(string_to_array(v_current, ','))) THEN
    EXECUTE format('ALTER ROLE authenticator SET "pgrst.db_schemas" TO %L', v_current || ',' || v_schema);
  END IF;
  NOTIFY pgrst, 'reload config';
  NOTIFY pgrst, 'reload schema';
END $$;
