type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type TableName =
  | "organizations" | "profiles" | "shops" | "product_categories" | "suppliers"
  | "products" | "stock_balances" | "stock_movements" | "sales" | "sale_items"
  | "customer_credits" | "restock_recommendations" | "generated_reports"
  | "offline_sync_queue" | "daily_backups" | "notifications";

export type Database = {
  sokoflow_inventory: {
    Tables: Record<TableName, GenericTable>;
    Views: Record<never, never>;
    Functions: {
      create_product: {
        Args: {
          p_organization_id: unknown; p_shop_id: unknown; p_recorded_by: string;
          p_name: string; p_sku: string; p_barcode: string | null; p_category: string | null;
          p_supplier: string | null; p_cost_price: number; p_selling_price: number;
          p_opening_stock: number; p_minimum_stock: number; p_expiry_date: string | null;
        };
        Returns: string;
      };
      record_sale: {
        Args: {
          p_organization_id: unknown;
          p_shop_id: unknown;
          p_recorded_by: string;
          p_customer_name: string;
          p_payment_method: string;
          p_items: Array<{ productId: string; quantity: number }>;
        };
        Returns: string;
      };
    };
    Enums: Record<string, string>;
    CompositeTypes: Record<never, never>;
  };
};
