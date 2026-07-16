export type UserRole = "OWNER" | "EMPLOYEE";

export type AppUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  title: string;
  shop: string;
  status: "ACTIVE" | "INVITED";
};

export type Product = {
  id: string;
  name: string;
  category: string;
  barcode: string;
  sku: string;
  supplier: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  expiryDate?: string;
};

export type SaleItemInput = { productId: string; quantity: number };

export type RecordedSale = {
  id: string;
  customerName: string;
  paymentMethod: string;
  soldBy: string;
  createdAt: string;
  totalAmount: number;
  totalProfit: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export type AppSettings = {
  appName: string;
  companyName: string;
  shopName: string;
  shopCode: string;
  shopLocation: string;
  reportEmail: string;
  enableAutoSave: boolean;
  language: "en" | "sn";
};

export type AppWorkspaceState = {
  users: AppUser[];
  products: Product[];
  sales: RecordedSale[];
  settings: AppSettings;
  suggestions: string[];
  lowStockNotice: string[];
};

export const emptyWorkspace: AppWorkspaceState = {
  users: [],
  products: [],
  sales: [],
  settings: {
    appName: "StockFlow",
    companyName: "",
    shopName: "Main shop",
    shopCode: "MAIN",
    shopLocation: "",
    reportEmail: "tafadzwawilsonsedze@gmail.com",
    enableAutoSave: true,
    language: "en",
  },
  suggestions: [],
  lowStockNotice: [],
};
