import type { AppWorkspaceState, AppUser, Product, RecordedSale } from "@/lib/app-types";
import { emptyWorkspace } from "@/lib/app-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Row = Record<string, unknown>;
const number = (value: unknown) => Number(value ?? 0);

export async function getProfile(userId: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error("FORBIDDEN");
  return data as Row;
}

export async function loadWorkspace(userId: string): Promise<AppWorkspaceState> {
  const db = getSupabaseAdmin();
  const profile = await getProfile(userId);
  const organizationId = String(profile.organization_id);

  const [organizationResult, profilesResult, shopsResult, productsResult, balancesResult, salesResult, itemsResult, categoriesResult, suppliersResult, suggestionsResult] = await Promise.all([
    db.from("organizations").select("*").eq("id", organizationId).single(),
    db.from("profiles").select("*").eq("organization_id", organizationId).order("created_at"),
    db.from("shops").select("*").eq("organization_id", organizationId),
    db.from("products").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    db.from("stock_balances").select("*").eq("organization_id", organizationId),
    db.from("sales").select("*").eq("organization_id", organizationId).order("sold_at", { ascending: false }).limit(100),
    db.from("sale_items").select("*"),
    db.from("product_categories").select("*").eq("organization_id", organizationId),
    db.from("suppliers").select("*").eq("organization_id", organizationId),
    db.from("restock_recommendations").select("*").eq("organization_id", organizationId).order("generated_at", { ascending: false }).limit(6),
  ]);

  const firstError = [organizationResult, profilesResult, shopsResult, productsResult, balancesResult, salesResult, itemsResult].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const organization = organizationResult.data as unknown as Row;
  const profiles = (profilesResult.data ?? []) as Row[];
  const shops = (shopsResult.data ?? []) as Row[];
  const productsRows = (productsResult.data ?? []) as Row[];
  const balances = (balancesResult.data ?? []) as Row[];
  const categories = (categoriesResult.data ?? []) as Row[];
  const suppliers = (suppliersResult.data ?? []) as Row[];
  const authUsers = await Promise.all(profiles.map((entry) => db.auth.admin.getUserById(String(entry.id))));

  const users: AppUser[] = profiles.map((entry, index) => {
    const shop = shops.find((value) => value.id === entry.shop_id);
    return {
      id: String(entry.id),
      fullName: String(entry.full_name),
      email: authUsers[index].data.user?.email ?? "",
      role: entry.role as AppUser["role"],
      title: String(entry.job_title ?? "Team member"),
      shop: String(shop?.name ?? shops[0]?.name ?? "Main shop"),
      status: entry.is_active ? "ACTIVE" : "INVITED",
    };
  });

  const products: Product[] = productsRows.map((entry) => {
    const balance = balances.filter((value) => value.product_id === entry.id).reduce((sum, value) => sum + number(value.quantity), 0);
    return {
      id: String(entry.id),
      name: String(entry.name),
      category: String(categories.find((value) => value.id === entry.category_id)?.name ?? "Uncategorised"),
      supplier: String(suppliers.find((value) => value.id === entry.supplier_id)?.name ?? ""),
      barcode: String(entry.barcode ?? ""),
      sku: String(entry.sku),
      costPrice: number(entry.cost_price),
      sellingPrice: number(entry.selling_price),
      stock: balance,
      minStock: number(entry.minimum_stock),
      expiryDate: entry.expiry_date ? String(entry.expiry_date) : undefined,
    };
  });

  const salesRows = (salesResult.data ?? []) as Row[];
  const saleItems = (itemsResult.data ?? []) as Row[];
  const sales: RecordedSale[] = salesRows.map((sale) => ({
    id: String(sale.id),
    customerName: String(sale.customer_name ?? "Walk-in"),
    paymentMethod: String(sale.payment_method),
    soldBy: users.find((entry) => entry.id === sale.recorded_by)?.fullName ?? "Team member",
    createdAt: String(sale.sold_at),
    totalAmount: number(sale.total_amount),
    totalProfit: number(sale.total_profit),
    items: saleItems.filter((entry) => entry.sale_id === sale.id).map((entry) => {
      const product = products.find((value) => value.id === entry.product_id);
      return {
        productId: String(entry.product_id),
        productName: product?.name ?? "Deleted product",
        quantity: number(entry.quantity),
        unitPrice: number(entry.unit_price),
        lineTotal: number(entry.quantity) * number(entry.unit_price),
      };
    }),
  }));

  return {
    ...emptyWorkspace,
    users,
    products,
    sales,
    settings: {
      appName: String(organization.app_name ?? "StockFlow"),
      companyName: String(organization.name ?? ""),
      reportEmail: String(organization.report_email ?? "tafadzwawilsonsedze@gmail.com"),
      enableAutoSave: Boolean(organization.enable_auto_save ?? true),
      language: organization.preferred_language === "sn" ? "sn" : "en",
    },
    suggestions: ((suggestionsResult.data ?? []) as Row[]).map((entry) => String(entry.recommendation)),
    lowStockNotice: products.filter((entry) => entry.stock <= entry.minStock).map((entry) => entry.name),
  };
}
