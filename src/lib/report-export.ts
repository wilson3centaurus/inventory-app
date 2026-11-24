import type { AppWorkspaceState, RecordedSale } from "@/lib/app-types";

export type ReportPeriod = "today" | "7d" | "30d" | "month" | "all";

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  all: "All time",
};

export function periodStart(period: ReportPeriod, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "today") return start;
  if (period === "7d") { start.setDate(start.getDate() - 6); return start; }
  if (period === "30d") { start.setDate(start.getDate() - 29); return start; }
  if (period === "month") { start.setDate(1); return start; }
  return null;
}

export function salesInPeriod(sales: RecordedSale[], period: ReportPeriod) {
  const start = periodStart(period);
  return start ? sales.filter((sale) => new Date(sale.createdAt) >= start) : sales;
}

export type ReportData = ReturnType<typeof buildReport>;

export function buildReport(workspace: AppWorkspaceState, period: ReportPeriod) {
  const sales = salesInPeriod(workspace.sales, period);
  const revenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const profit = sales.reduce((sum, sale) => sum + sale.totalProfit, 0);
  const byMethod = new Map<string, { count: number; total: number }>();
  sales.forEach((sale) => {
    const entry = byMethod.get(sale.paymentMethod) ?? { count: 0, total: 0 };
    byMethod.set(sale.paymentMethod, { count: entry.count + 1, total: entry.total + sale.totalAmount });
  });
  const byProduct = new Map<string, { quantity: number; revenue: number }>();
  sales.flatMap((sale) => sale.items).forEach((item) => {
    const entry = byProduct.get(item.productName) ?? { quantity: 0, revenue: 0 };
    byProduct.set(item.productName, { quantity: entry.quantity + item.quantity, revenue: entry.revenue + item.lineTotal });
  });
  return {
    title: `${workspace.settings.companyName || workspace.settings.appName} sales report`,
    business: workspace.settings.companyName || workspace.settings.appName,
    shop: workspace.settings.shopName,
    logoUrl: workspace.settings.logoUrl,
    periodLabel: PERIOD_LABELS[period],
    generatedAt: new Date(),
    sales,
    revenue,
    profit,
    margin: revenue ? (profit / revenue) * 100 : 0,
    paymentMethods: [...byMethod.entries()].map(([method, value]) => ({ method, ...value })).sort((a, b) => b.total - a.total),
    products: [...byProduct.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.revenue - a.revenue),
    stock: [...workspace.products].sort((a, b) => a.name.localeCompare(b.name)).map((product) => ({
      ...product,
      value: product.stock * product.costPrice,
      status: product.stock <= 0 ? "Out of stock" : product.stock <= product.minStock ? "Low" : "OK",
    })),
  };
}

const money = (value: number) => `$${value.toFixed(2)}`;
const dateTime = (value: string | Date) => new Date(value).toLocaleString("en-ZW", { dateStyle: "medium", timeStyle: "short" });
const itemsText = (sale: RecordedSale) => sale.items.map((item) => `${item.quantity} x ${item.productName}`).join(", ");
const fileStem = (report: ReportData) => `${report.business}-report-${report.periodLabel}-${report.generatedAt.toISOString().slice(0, 10)}`.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").toLowerCase();

async function logoAsPng(dataUrl: string) {
  if (!dataUrl) return null;
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = reject; element.src = dataUrl; });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    return { data: canvas.toDataURL("image/png"), width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    return null;
  }
}

export async function exportReportPdf(report: ReportData) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const green: [number, number, number] = [23, 63, 53];
  let y = 40;

  const logo = await logoAsPng(report.logoUrl);
  let textX = 40;
  if (logo) {
    const size = 44;
    const ratio = logo.width / logo.height;
    doc.addImage(logo.data, "PNG", 40, y - 4, ratio >= 1 ? size : size * ratio, ratio >= 1 ? size / ratio : size);
    textX = 96;
  }
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...green).text(report.business, textX, y + 12);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(100).text(`${report.shop} - Sales report - ${report.periodLabel}`, textX, y + 28);
  doc.setFontSize(8).text(`Generated ${dateTime(report.generatedAt)}`, width - 40, y + 12, { align: "right" });
  y += 60;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Gross sales", "Gross profit", "Margin", "Transactions"]],
    body: [[money(report.revenue), money(report.profit), `${report.margin.toFixed(1)}%`, String(report.sales.length)]],
    headStyles: { fillColor: green },
    bodyStyles: { fontStyle: "bold", fontSize: 12 },
  });

  const section = (title: string, head: string[], body: string[][], columnStyles: Record<number, { halign: "right" }> = {}) => {
    const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    let startY = lastY + 26;
    if (startY > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); startY = 50; }
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...green).text(title, 40, startY - 8);
    autoTable(doc, {
      startY,
      head: [head],
      body: body.length ? body : [[{ content: "No records for this period.", colSpan: head.length, styles: { halign: "center", textColor: 140 } } as unknown as string]],
      headStyles: { fillColor: green, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [244, 245, 239] },
      columnStyles,
    });
  };

  section("Payment methods", ["Method", "Sales", "Total"], report.paymentMethods.map((entry) => [entry.method, String(entry.count), money(entry.total)]), { 1: { halign: "right" }, 2: { halign: "right" } });
  section("Sales", ["Date", "Customer", "Payment", "Sold by", "Items", "Total", "Profit"], report.sales.map((sale) => [dateTime(sale.createdAt), sale.customerName, sale.paymentReference ? `${sale.paymentMethod} (${sale.paymentReference})` : sale.paymentMethod, sale.soldBy, itemsText(sale), money(sale.totalAmount), money(sale.totalProfit)]), { 5: { halign: "right" }, 6: { halign: "right" } });
  section("Product performance", ["Product", "Qty sold", "Revenue"], report.products.map((entry) => [entry.name, String(entry.quantity), money(entry.revenue)]), { 1: { halign: "right" }, 2: { halign: "right" } });
  section("Stock on hand", ["Product", "SKU", "In stock", "Low level", "Cost", "Price", "Stock value", "Status"], report.stock.map((item) => [item.name, item.sku, String(item.stock), String(item.minStock), money(item.costPrice), money(item.sellingPrice), money(item.value), item.status]), { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(150).text(`Page ${page} of ${pages}`, width - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }
  doc.save(`${fileStem(report)}.pdf`);
}

export async function exportReportExcel(report: ReportData) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const header = (labels: string[]) => labels.map((value) => ({ value, fontWeight: "bold" as const, backgroundColor: "#173F35", textColor: "#FFFFFF" }));
  const usd = "$#,##0.00";

  const summary = [
    [{ value: report.title, fontWeight: "bold" as const, fontSize: 14 }],
    ["Shop", report.shop],
    ["Period", report.periodLabel],
    ["Generated", dateTime(report.generatedAt)],
    [],
    header(["Measure", "Value"]),
    ["Gross sales", { value: report.revenue, format: usd }],
    ["Gross profit", { value: report.profit, format: usd }],
    ["Profit margin %", { value: Number(report.margin.toFixed(1)) }],
    ["Transactions", { value: report.sales.length }],
    [],
    header(["Payment method", "Sales", "Total"]),
    ...report.paymentMethods.map((entry) => [entry.method, { value: entry.count }, { value: entry.total, format: usd }]),
  ];
  const sales = [
    header(["Date", "Customer", "Payment", "Payment ref", "Sold by", "Items", "Total", "Profit"]),
    ...report.sales.map((sale) => [{ value: new Date(sale.createdAt), format: "yyyy-mm-dd hh:mm" }, sale.customerName, sale.paymentMethod, sale.paymentReference ?? "", sale.soldBy, itemsText(sale), { value: sale.totalAmount, format: usd }, { value: sale.totalProfit, format: usd }]),
  ];
  const lines = [
    header(["Date", "Customer", "Product", "Quantity", "Unit price", "Line total"]),
    ...report.sales.flatMap((sale) => sale.items.map((item) => [{ value: new Date(sale.createdAt), format: "yyyy-mm-dd hh:mm" }, sale.customerName, item.productName, { value: item.quantity }, { value: item.unitPrice, format: usd }, { value: item.lineTotal, format: usd }])),
  ];
  const products = [
    header(["Product", "Quantity sold", "Revenue"]),
    ...report.products.map((entry) => [entry.name, { value: entry.quantity }, { value: entry.revenue, format: usd }]),
  ];
  const stock = [
    header(["Product", "SKU", "Barcode", "Category", "Supplier", "In stock", "Low-stock level", "Cost price", "Selling price", "Stock value", "Expiry", "Status"]),
    ...report.stock.map((item) => [item.name, item.sku, item.barcode, item.category, item.supplier, { value: item.stock }, { value: item.minStock }, { value: item.costPrice, format: usd }, { value: item.sellingPrice, format: usd }, { value: item.value, format: usd }, item.expiryDate?.slice(0, 10) ?? "", item.status]),
  ];

  await writeXlsxFile([
    { sheet: "Summary", data: summary, columns: [{ width: 24 }, { width: 22 }, { width: 14 }] },
    { sheet: "Sales", data: sales, columns: [{ width: 18 }, { width: 20 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 50 }, { width: 12 }, { width: 12 }], stickyRowsCount: 1 },
    { sheet: "Sale items", data: lines, columns: [{ width: 18 }, { width: 20 }, { width: 30 }, { width: 10 }, { width: 12 }, { width: 12 }], stickyRowsCount: 1 },
    { sheet: "Products sold", data: products, columns: [{ width: 30 }, { width: 14 }, { width: 14 }], stickyRowsCount: 1 },
    { sheet: "Stock", data: stock, columns: [{ width: 30 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 10 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }], stickyRowsCount: 1 },
  ]).toFile(`${fileStem(report)}.xlsx`);
}
