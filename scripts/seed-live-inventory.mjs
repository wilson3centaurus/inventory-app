import fs from "node:fs";
import path from "node:path";

function readEnv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = readEnv(path.join(process.cwd(), ".env"));
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const schema = "sokoflow_inventory";

if (!baseUrl || !serviceKey) {
  throw new Error("Missing Supabase credentials in .env");
}

async function rest(pathname, { method = "GET", query, body, count = false } = {}) {
  const url = new URL(`${baseUrl}/rest/v1/${pathname}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: count ? "count=exact" : "return=representation",
      "Accept-Profile": schema,
      "Content-Profile": schema,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status} ${text}`);
  }

  const contentRange = response.headers.get("content-range");
  const exactCount = contentRange?.includes("/") ? Number(contentRange.split("/")[1]) : null;
  return { data, count: Number.isFinite(exactCount) ? exactCount : null };
}

async function rpc(name, payload) {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Profile": schema,
      "Content-Profile": schema,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`rpc ${name} failed: ${response.status} ${text}`);
  }
  return data;
}

const products = [
  { name: "Rice 2kg Pack", sku: "GRC-RICE-2KG", barcode: "263000100001", category: "Groceries", supplier: "National Foods", costPrice: 2.8, sellingPrice: 3.6, stock: 48, minStock: 10 },
  { name: "Rice 5kg Pack", sku: "GRC-RICE-5KG", barcode: "263000100002", category: "Groceries", supplier: "National Foods", costPrice: 6.9, sellingPrice: 8.2, stock: 22, minStock: 6 },
  { name: "Sugar 2kg", sku: "GRC-SUGAR-2KG", barcode: "263000100003", category: "Groceries", supplier: "Starafricorp", costPrice: 2.1, sellingPrice: 2.8, stock: 38, minStock: 8 },
  { name: "Mealie Meal 10kg", sku: "GRC-MEALIE-10KG", barcode: "263000100004", category: "Groceries", supplier: "National Foods", costPrice: 5.7, sellingPrice: 6.9, stock: 31, minStock: 8 },
  { name: "Cooking Oil 2L", sku: "GRC-OIL-2L", barcode: "263000100005", category: "Groceries", supplier: "Surface Wilmar", costPrice: 3.2, sellingPrice: 4.1, stock: 28, minStock: 8 },
  { name: "Salt 1kg", sku: "GRC-SALT-1KG", barcode: "263000100006", category: "Groceries", supplier: "Cerebos", costPrice: 0.55, sellingPrice: 0.9, stock: 55, minStock: 12 },
  { name: "Coca-Cola 2L", sku: "DRK-COKE-2L", barcode: "263000100007", category: "Beverages", supplier: "Delta Beverages", costPrice: 1.25, sellingPrice: 1.8, stock: 44, minStock: 12 },
  { name: "Fanta Orange 2L", sku: "DRK-FANTA-2L", barcode: "263000100008", category: "Beverages", supplier: "Delta Beverages", costPrice: 1.25, sellingPrice: 1.8, stock: 33, minStock: 10 },
  { name: "Sprite 2L", sku: "DRK-SPRITE-2L", barcode: "263000100009", category: "Beverages", supplier: "Delta Beverages", costPrice: 1.25, sellingPrice: 1.8, stock: 24, minStock: 10 },
  { name: "Mazoe Orange Crush 2L", sku: "DRK-MAZOE-2L", barcode: "263000100010", category: "Beverages", supplier: "Schweppes Zimbabwe", costPrice: 2.4, sellingPrice: 3.2, stock: 18, minStock: 6 },
  { name: "Bottled Water 500ml", sku: "DRK-WATER-500", barcode: "263000100011", category: "Beverages", supplier: "Varun Beverages", costPrice: 0.28, sellingPrice: 0.5, stock: 72, minStock: 18 },
  { name: "Long Life Milk 1L", sku: "DRY-MILK-1L", barcode: "263000100012", category: "Dairy", supplier: "Dairibord", costPrice: 1.1, sellingPrice: 1.55, stock: 25, minStock: 8, expiryDate: "2026-08-20" },
  { name: "Yoghurt 500ml", sku: "DRY-YOG-500", barcode: "263000100013", category: "Dairy", supplier: "Dairibord", costPrice: 1.45, sellingPrice: 1.95, stock: 14, minStock: 5, expiryDate: "2026-07-28" },
  { name: "Bread Loaf", sku: "BKY-BREAD-LOAF", barcode: "263000100014", category: "Bakery", supplier: "Baker's Inn", costPrice: 0.75, sellingPrice: 1.0, stock: 26, minStock: 8, expiryDate: "2026-07-22" },
  { name: "Eggs Tray 30", sku: "DRY-EGGS-30", barcode: "263000100015", category: "Dairy", supplier: "Irvine's", costPrice: 3.9, sellingPrice: 4.8, stock: 12, minStock: 4, expiryDate: "2026-08-05" },
  { name: "Bath Soap Bar", sku: "HYG-SOAP-BAR", barcode: "263000100016", category: "Home Care", supplier: "Trade Kings", costPrice: 0.42, sellingPrice: 0.75, stock: 60, minStock: 12 },
  { name: "Laundry Powder 2kg", sku: "HYG-LAUNDRY-2KG", barcode: "263000100017", category: "Home Care", supplier: "Ariel Zimbabwe", costPrice: 2.9, sellingPrice: 3.8, stock: 21, minStock: 6 },
  { name: "Dishwashing Liquid 750ml", sku: "HYG-DISH-750", barcode: "263000100018", category: "Home Care", supplier: "Trade Kings", costPrice: 1.05, sellingPrice: 1.55, stock: 19, minStock: 6 },
  { name: "Toilet Paper 4 Pack", sku: "HYG-TP-4PK", barcode: "263000100019", category: "Home Care", supplier: "Nampak", costPrice: 1.4, sellingPrice: 2.0, stock: 30, minStock: 8 },
  { name: "Cooking Beans 2kg", sku: "GRC-BEANS-2KG", barcode: "263000100020", category: "Groceries", supplier: "Murewa Foods", costPrice: 2.35, sellingPrice: 3.0, stock: 20, minStock: 6 },
  { name: "Kapenta 500g", sku: "GRC-KAPENTA-500", barcode: "263000100021", category: "Groceries", supplier: "Lake Harvest", costPrice: 3.1, sellingPrice: 4.1, stock: 9, minStock: 4 },
  { name: "Peanut Butter 375g", sku: "GRC-PB-375", barcode: "263000100022", category: "Groceries", supplier: "Cairns", costPrice: 1.6, sellingPrice: 2.2, stock: 17, minStock: 5 },
  { name: "Tomato Sauce 700ml", sku: "GRC-SAUCE-700", barcode: "263000100023", category: "Groceries", supplier: "Cairns", costPrice: 1.2, sellingPrice: 1.75, stock: 16, minStock: 5 },
  { name: "Matches Box", sku: "HSE-MATCHES", barcode: "263000100024", category: "Household", supplier: "Sable Chemicals", costPrice: 0.1, sellingPrice: 0.2, stock: 96, minStock: 20 },
  { name: "Candle Pack", sku: "HSE-CANDLES", barcode: "263000100025", category: "Household", supplier: "Sable Chemicals", costPrice: 0.95, sellingPrice: 1.45, stock: 27, minStock: 8 },
];

const salesSeed = [
  { customer: "Seed Sale Mon", payment: "Cash", daysAgo: 0, items: [["DRK-COKE-2L", 3], ["GRC-RICE-2KG", 2]] },
  { customer: "Seed Sale Tue", payment: "EcoCash", daysAgo: 1, items: [["DRK-FANTA-2L", 2], ["GRC-SUGAR-2KG", 1], ["HYG-SOAP-BAR", 4]] },
  { customer: "Seed Sale Wed", payment: "Cash", daysAgo: 2, items: [["DRK-WATER-500", 6], ["BKY-BREAD-LOAF", 3]] },
  { customer: "Seed Sale Thu", payment: "Card", daysAgo: 3, items: [["GRC-OIL-2L", 1], ["GRC-MEALIE-10KG", 1]] },
  { customer: "Seed Sale Fri", payment: "Cash", daysAgo: 4, items: [["GRC-PB-375", 2], ["GRC-SAUCE-700", 2], ["HYG-TP-4PK", 1]] },
  { customer: "Seed Sale Sat", payment: "Credit", daysAgo: 5, items: [["GRC-BEANS-2KG", 2], ["DRY-MILK-1L", 3]] },
];

async function main() {
  const organizationsResponse = await rest("organizations", {
    query: { select: "id,name", order: "created_at.asc", limit: 1 },
  });
  const organization = organizationsResponse.data?.[0];
  if (!organization) throw new Error("No organization found to seed.");

  const shopsResponse = await rest("shops", {
    query: {
      select: "id,name,code,is_primary",
      organization_id: `eq.${organization.id}`,
      order: "is_primary.desc,created_at.asc",
      limit: 1,
    },
  });
  const shop = shopsResponse.data?.[0];
  if (!shop) throw new Error("No shop found to seed.");

  const ownerResponse = await rest("profiles", {
    query: {
      select: "id",
      organization_id: `eq.${organization.id}`,
      role: "eq.OWNER",
      limit: 1,
    },
  });
  const owner = ownerResponse.data?.[0];
  if (!owner) throw new Error("No owner profile found to seed.");

  let createdProducts = 0;
  for (const product of products) {
    const existingProduct = await rest("products", {
      query: {
        select: "id",
        organization_id: `eq.${organization.id}`,
        sku: `eq.${product.sku}`,
        limit: 1,
      },
    });

    if (existingProduct.data?.length) continue;

    await rpc("create_product", {
      p_organization_id: organization.id,
      p_shop_id: shop.id,
      p_recorded_by: owner.id,
      p_name: product.name,
      p_sku: product.sku,
      p_barcode: product.barcode,
      p_category: product.category,
      p_supplier: product.supplier,
      p_cost_price: product.costPrice,
      p_selling_price: product.sellingPrice,
      p_opening_stock: product.stock,
      p_minimum_stock: product.minStock,
      p_expiry_date: product.expiryDate ?? null,
    });
    createdProducts += 1;
  }

  const productRows = await rest("products", {
    query: {
      select: "id,sku",
      organization_id: `eq.${organization.id}`,
      limit: 200,
    },
  });
  const productMap = new Map((productRows.data ?? []).map((entry) => [entry.sku, entry.id]));

  const seededSales = await rest("sales", {
    query: {
      select: "id",
      organization_id: `eq.${organization.id}`,
      customer_name: "ilike.Seed Sale*",
      limit: 20,
    },
  });

  let createdSales = 0;
  if (!(seededSales.data?.length ?? 0)) {
    for (const sale of salesSeed) {
      const items = sale.items
        .map(([sku, quantity]) => ({ productId: productMap.get(sku), quantity }))
        .filter((entry) => entry.productId);

      const saleId = await rpc("record_sale", {
        p_organization_id: organization.id,
        p_shop_id: shop.id,
        p_recorded_by: owner.id,
        p_customer_name: sale.customer,
        p_payment_method: sale.payment,
        p_items: items,
      });

      const soldAt = new Date();
      soldAt.setHours(10, 0, 0, 0);
      soldAt.setDate(soldAt.getDate() - sale.daysAgo);

      await rest("sales", {
        method: "PATCH",
        query: { id: `eq.${saleId}` },
        body: { sold_at: soldAt.toISOString() },
      });
      createdSales += 1;
    }
  }

  const recommendations = [
    { sku: "GRC-OIL-2L", text: "Restock Cooking Oil before Friday, it has been moving steadily in recent daily sales." },
    { sku: "DRK-COKE-2L", text: "Coca-Cola 2L is moving fast. Plan a top-up before the weekend rush." },
    { sku: "DRY-YOG-500", text: "Yoghurt expires soon. Run a small promo to avoid wastage." },
  ];

  for (const entry of recommendations) {
    const productId = productMap.get(entry.sku);
    if (!productId) continue;
    const existingRecommendation = await rest("restock_recommendations", {
      query: {
        select: "id",
        organization_id: `eq.${organization.id}`,
        product_id: `eq.${productId}`,
        limit: 1,
      },
    });
    if (existingRecommendation.data?.length) continue;
    await rest("restock_recommendations", {
      method: "POST",
      body: {
        organization_id: organization.id,
        product_id: productId,
        recommendation: entry.text,
        confidence_score: 0.86,
      },
    });
  }

  console.log(`Seed complete for ${organization.name}. Created ${createdProducts} new products and ${createdSales} seeded sales.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
