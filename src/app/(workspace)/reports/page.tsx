'use client';

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, FileSpreadsheet, FileText, Mail, PackageSearch, ReceiptText, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useWorkspace } from "@/components/workspace-provider";
import { PERIOD_LABELS, buildReport, exportReportExcel, exportReportPdf, type ReportPeriod } from "@/lib/report-export";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function ReportsPage() {
  const { workspace, emailReport } = useWorkspace();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState<"" | "pdf" | "excel">("");
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [showAllSales, setShowAllSales] = useState(false);
  const report = useMemo(() => buildReport(workspace, period), [workspace, period]);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - index));
    const sales = workspace.sales.filter((sale) => new Date(sale.createdAt).toDateString() === date.toDateString());
    return { day: date.toLocaleDateString("en", { weekday: "short" }), revenue: sales.reduce((sum, sale) => sum + sale.totalAmount, 0), profit: sales.reduce((sum, sale) => sum + sale.totalProfit, 0) };
  });
  const peak = Math.max(...days.map((entry) => entry.revenue), 1);
  const movers = report.products.slice().sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const visibleSales = showAllSales ? report.sales : report.sales.slice(0, 10);

  const send = async () => { setSending(true); const result = await emailReport(); setSending(false); setMessage(result.message); };
  const runExport = async (kind: "pdf" | "excel") => {
    setExporting(kind);
    setMessage("");
    try {
      if (kind === "pdf") await exportReportPdf(report); else await exportReportExcel(report);
      setMessage(`${kind === "pdf" ? "PDF" : "Excel"} report for ${PERIOD_LABELS[period].toLowerCase()} downloaded.`);
    } catch (error) {
      setMessage(`Export failed: ${error instanceof Error ? error.message : "unknown error"}.`);
    } finally {
      setExporting("");
    }
  };

  return (
    <>
      <AppHeader title="Insights" description="Live numbers, ready to export." action={<button type="button" onClick={() => void send()} disabled={sending} className="primary-solid hidden h-10 items-center gap-2 rounded-[14px] px-3 text-[10px] font-bold sm:flex"><Mail className="size-3.5" /> {sending ? "Sending..." : "Email brief"}</button>} />
      {message ? <div className="mb-3 rounded-[14px] bg-primary/7 px-3 py-2.5 text-[11px] text-primary">{message}</div> : null}

      <section className="app-card mb-3 flex flex-col gap-3 rounded-[22px] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((value) => <button key={value} type="button" onClick={() => setPeriod(value)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${period === value ? "bg-primary text-white" : "border border-border bg-surface text-muted"}`}>{PERIOD_LABELS[value]}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" disabled={Boolean(exporting)} onClick={() => void runExport("pdf")} className="flex min-h-10 items-center justify-center gap-2 rounded-[14px] bg-primary px-3 text-[11px] font-extrabold text-white disabled:opacity-60"><FileText className="size-4" />{exporting === "pdf" ? "Preparing PDF..." : "Export PDF"}</button>
          <button type="button" disabled={Boolean(exporting)} onClick={() => void runExport("excel")} className="flex min-h-10 items-center justify-center gap-2 rounded-[14px] bg-accent px-3 text-[11px] font-extrabold text-accent-ink disabled:opacity-60"><FileSpreadsheet className="size-4" />{exporting === "excel" ? "Preparing Excel..." : "Export Excel"}</button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ label: "Gross sales", value: money.format(report.revenue), icon: ArrowUpRight, tone: "text-primary" }, { label: "Gross profit", value: money.format(report.profit), icon: ArrowUpRight, tone: "text-primary" }, { label: "Profit margin", value: `${report.margin.toFixed(1)}%`, icon: report.margin >= 0 ? ArrowUpRight : ArrowDownRight, tone: report.margin >= 0 ? "text-primary" : "text-danger" }, { label: "Transactions", value: String(report.sales.length), icon: BarChart3, tone: "text-primary" }].map(({ label, value, icon: Icon, tone }) => <div key={label} className="app-card rounded-[20px] p-3.5"><div className="flex items-center justify-between"><p className="text-[9px] font-bold text-muted">{label}</p><Icon className={`size-3.5 ${tone}`} /></div><p className="mt-2 text-lg font-extrabold tracking-tight sm:text-xl">{value}</p><p className="mt-1 text-[8px] uppercase tracking-wide text-muted">{PERIOD_LABELS[period]}</p></div>)}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_.8fr]">
        <section className="app-card rounded-[22px] p-4">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Performance</p><h2 className="mt-1 text-sm font-extrabold">Revenue & profit</h2></div><span className="rounded-full bg-primary/7 px-2.5 py-1 text-[9px] font-bold text-primary">Last 7 days</span></div>
          <div className="mt-5 flex h-48 items-end gap-2 sm:h-56">
            {days.map((entry) => <div key={entry.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-[85%] w-full max-w-12 items-end justify-center gap-1"><div title={`Revenue ${money.format(entry.revenue)}`} className="w-2/3 rounded-t-lg bg-primary" style={{ height: `${Math.max(entry.revenue / peak * 100, 3)}%` }} /><div title={`Profit ${money.format(entry.profit)}`} className="w-1/3 rounded-t-lg bg-accent" style={{ height: `${Math.max(entry.profit / peak * 100, 3)}%` }} /></div><span className="text-[9px] font-bold text-muted">{entry.day}</span></div>)}
          </div>
          <div className="mt-3 flex gap-4 border-t border-border pt-3 text-[9px] text-muted"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" /> Revenue</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-accent" /> Profit</span></div>
        </section>

        <section className="app-card rounded-[22px] p-4">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Product velocity</p><h2 className="mt-1 text-sm font-extrabold">Fast movers</h2></div><PackageSearch className="size-4 text-primary" /></div>
          <div className="mt-3 space-y-2">{movers.length ? movers.map((entry, index) => <div key={entry.name} className="flex items-center gap-3 rounded-2xl bg-surface-soft p-3"><span className="grid size-7 place-items-center rounded-xl bg-primary text-[10px] font-extrabold text-white">{index + 1}</span><p className="min-w-0 flex-1 truncate text-[11px] font-bold">{entry.name}</p><p className="text-[10px] font-extrabold text-primary">{entry.quantity} sold</p></div>) : <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-border px-5 text-center text-[10px] text-muted">No sales in this period yet.</div>}</div>
          {report.paymentMethods.length ? <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">{report.paymentMethods.map((entry) => <span key={entry.method} className="rounded-full bg-primary/7 px-2.5 py-1 text-[9px] font-bold text-primary">{entry.method} · {money.format(entry.total)}</span>)}</div> : null}
        </section>
      </div>

      <section id="sales" className="app-card mt-3 rounded-[22px] p-4">
        <div className="flex items-center justify-between"><div><p className="eyebrow">Sales ledger</p><h2 className="mt-1 text-sm font-extrabold">{report.sales.length} {report.sales.length === 1 ? "sale" : "sales"} · {PERIOD_LABELS[period]}</h2></div><ReceiptText className="size-4 text-primary" /></div>
        {report.sales.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[10px]"><thead><tr className="border-b border-border text-[9px] uppercase tracking-wide text-muted"><th className="py-2 pr-3 font-bold">Date</th><th className="py-2 pr-3 font-bold">Customer</th><th className="py-2 pr-3 font-bold">Items</th><th className="py-2 pr-3 font-bold">Payment</th><th className="py-2 pr-3 font-bold">Sold by</th><th className="py-2 text-right font-bold">Total</th></tr></thead><tbody>{visibleSales.map((sale) => <tr key={sale.id} className="border-b border-border/60 last:border-0"><td className="whitespace-nowrap py-2.5 pr-3 text-muted">{new Date(sale.createdAt).toLocaleString("en-ZW", { dateStyle: "medium", timeStyle: "short" })}</td><td className="py-2.5 pr-3 font-bold">{sale.customerName}</td><td className="max-w-[240px] truncate py-2.5 pr-3 text-muted" title={sale.items.map((item) => `${item.quantity} x ${item.productName}`).join(", ")}>{sale.items.map((item) => `${item.quantity} x ${item.productName}`).join(", ")}</td><td className="py-2.5 pr-3"><span className="rounded-full bg-primary/7 px-2 py-0.5 font-bold text-primary" title={sale.paymentReference}>{sale.paymentMethod}</span></td><td className="py-2.5 pr-3 text-muted">{sale.soldBy}</td><td className="py-2.5 text-right font-extrabold">{money.format(sale.totalAmount)}</td></tr>)}</tbody></table></div> : <div className="mt-3 grid min-h-32 place-items-center rounded-2xl border border-dashed border-border text-[10px] text-muted">No sales in this period.</div>}
        {report.sales.length > 10 ? <button type="button" onClick={() => setShowAllSales((value) => !value)} className="mt-3 text-[10px] font-bold text-primary">{showAllSales ? "Show fewer" : `Show all ${report.sales.length} sales`}</button> : null}
      </section>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <section className="app-card rounded-[22px] p-4"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-accent text-primary"><Sparkles className="size-4" /></span><div><p className="eyebrow">Stock intelligence</p><h2 className="mt-1 text-sm font-extrabold">Recommendations</h2></div></div><div className="mt-3 space-y-2">{workspace.suggestions.length ? workspace.suggestions.slice(0, 4).map((text) => <p key={text} className="rounded-2xl bg-surface-soft p-3 text-[10px] leading-5 text-muted">{text}</p>) : workspace.lowStockNotice.length ? workspace.lowStockNotice.slice(0, 4).map((name) => <p key={name} className="rounded-2xl bg-surface-soft p-3 text-[10px] leading-5 text-muted">{name} is at or below its low-stock level. Restock soon.</p>) : <p className="rounded-2xl border border-dashed border-border p-4 text-[10px] leading-5 text-muted">All products are above their low-stock levels.</p>}</div></section>
        <section className="rounded-[22px] bg-primary p-4 text-white"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-white/45">Daily delivery</p><h2 className="mt-2 text-lg font-extrabold">Your numbers, in your inbox.</h2><p className="mt-2 max-w-md text-[11px] leading-5 text-white/55">Send today&apos;s stock brief to {workspace.settings.reportEmail}. Change this address any time under Workspace.</p><button type="button" disabled={sending} onClick={() => void send()} className="mt-5 flex min-h-11 items-center gap-2 rounded-[14px] bg-accent px-4 text-[11px] font-extrabold text-accent-ink"><Mail className="size-4" /> {sending ? "Sending report..." : "Email stock brief"}</button></section>
      </div>
    </>
  );
}
