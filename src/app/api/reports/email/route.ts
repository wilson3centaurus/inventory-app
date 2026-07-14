import { apiError, requireApiUser } from "@/lib/supabase-admin";
import { loadWorkspace } from "@/lib/workspace-data";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const workspace = await loadWorkspace(user.id);
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) return Response.json({ message: "Add RESEND_API_KEY to enable email delivery." }, { status: 400 });

    const today = new Date().toDateString();
    const sales = workspace.sales.filter((sale) => new Date(sale.createdAt).toDateString() === today);
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.totalProfit, 0);
    const lowStock = workspace.products.filter((product) => product.stock <= product.minStock);
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17231f">
        <div style="background:#173f35;color:white;border-radius:20px;padding:24px"><div style="font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:1.5px">Daily stock brief</div><h1 style="margin:8px 0 0">${escapeHtml(workspace.settings.appName)}</h1></div>
        <div style="display:flex;gap:12px;margin:16px 0"><div style="flex:1;background:#f4f5ef;border-radius:14px;padding:16px">Sales<br><strong>$${totalSales.toFixed(2)}</strong></div><div style="flex:1;background:#f4f5ef;border-radius:14px;padding:16px">Profit<br><strong>$${totalProfit.toFixed(2)}</strong></div></div>
        <h2 style="font-size:16px">Low-stock watch</h2><ul>${lowStock.length ? lowStock.map((item) => `<li>${escapeHtml(item.name)}: ${item.stock} remaining (minimum ${item.minStock})</li>`).join("") : "<li>No low-stock products.</li>"}</ul>
        <p style="color:#68766f;font-size:12px">Generated from live StockFlow data on ${new Date().toLocaleDateString("en-ZW", { dateStyle: "long" })}.</p>
      </div>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "StockFlow Reports <onboarding@resend.dev>",
        reply_to: "tafadzwawilsonsedze@gmail.com",
        to: [workspace.settings.reportEmail || "tafadzwawilsonsedze@gmail.com"],
        subject: `${workspace.settings.appName} daily stock brief`,
        html,
      }),
    });
    if (!response.ok) throw new Error("Email provider rejected the report. Verify your sender domain in Resend.");
    return Response.json({ message: `Report sent to ${workspace.settings.reportEmail}.` });
  } catch (error) {
    return apiError(error);
  }
}
