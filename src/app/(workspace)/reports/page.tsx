'use client';

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Mail, PackageSearch, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useWorkspace } from "@/components/workspace-provider";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function ReportsPage() {
  const { workspace, emailReport } = useWorkspace();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const revenue = workspace.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const profit = workspace.sales.reduce((sum, sale) => sum + sale.totalProfit, 0);
  const margin = revenue ? (profit / revenue) * 100 : 0;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - index));
    const sales = workspace.sales.filter((sale) => new Date(sale.createdAt).toDateString() === date.toDateString());
    return { day: date.toLocaleDateString("en", { weekday: "short" }), revenue: sales.reduce((sum, sale) => sum + sale.totalAmount, 0), profit: sales.reduce((sum, sale) => sum + sale.totalProfit, 0) };
  });
  const peak = Math.max(...days.map((entry) => entry.revenue), 1);
  const sold = new Map<string, number>();
  workspace.sales.flatMap((sale) => sale.items).forEach((item) => sold.set(item.productName, (sold.get(item.productName) ?? 0) + item.quantity));
  const movers = [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const send = async () => { setSending(true); const result = await emailReport(); setSending(false); setMessage(result.message); };

  return (
    <>
      <AppHeader title="Insights" description="Live numbers, no spreadsheet required." action={<button type="button" onClick={() => void send()} disabled={sending} className="hidden h-10 items-center gap-2 rounded-[14px] bg-primary px-3 text-[10px] font-bold text-white sm:flex"><Mail className="size-3.5" /> {sending ? "Sending..." : "Email brief"}</button>} />
      {message ? <div className="mb-3 rounded-[14px] bg-primary/7 px-3 py-2.5 text-[11px] text-primary">{message}</div> : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ label: "Gross sales", value: money.format(revenue), icon: ArrowUpRight, tone: "text-primary" }, { label: "Gross profit", value: money.format(profit), icon: ArrowUpRight, tone: "text-primary" }, { label: "Profit margin", value: `${margin.toFixed(1)}%`, icon: margin >= 0 ? ArrowUpRight : ArrowDownRight, tone: margin >= 0 ? "text-primary" : "text-danger" }, { label: "Transactions", value: String(workspace.sales.length), icon: BarChart3, tone: "text-primary" }].map(({ label, value, icon: Icon, tone }) => <div key={label} className="app-card rounded-[20px] p-3.5"><div className="flex items-center justify-between"><p className="text-[9px] font-bold text-muted">{label}</p><Icon className={`size-3.5 ${tone}`} /></div><p className="mt-2 text-lg font-extrabold tracking-tight sm:text-xl">{value}</p><p className="mt-1 text-[8px] uppercase tracking-wide text-muted">All recorded time</p></div>)}
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
          <div className="mt-3 space-y-2">{movers.length ? movers.map(([name, quantity], index) => <div key={name} className="flex items-center gap-3 rounded-2xl bg-surface-soft p-3"><span className="grid size-7 place-items-center rounded-xl bg-primary text-[10px] font-extrabold text-white">{index + 1}</span><p className="min-w-0 flex-1 truncate text-[11px] font-bold">{name}</p><p className="text-[10px] font-extrabold text-primary">{quantity} sold</p></div>) : <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-border px-5 text-center text-[10px] text-muted">Product rankings will appear after real sales are recorded.</div>}</div>
        </section>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <section className="app-card rounded-[22px] p-4"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-accent text-primary"><Sparkles className="size-4" /></span><div><p className="eyebrow">Stock intelligence</p><h2 className="mt-1 text-sm font-extrabold">Recommendations</h2></div></div><div className="mt-3 space-y-2">{workspace.suggestions.length ? workspace.suggestions.slice(0, 4).map((text) => <p key={text} className="rounded-2xl bg-surface-soft p-3 text-[10px] leading-5 text-muted">{text}</p>) : <p className="rounded-2xl border border-dashed border-border p-4 text-[10px] leading-5 text-muted">Recommendations will use real product movement history once enough sales have been collected.</p>}</div></section>
        <section className="rounded-[22px] bg-primary p-4 text-white"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-white/45">Daily delivery</p><h2 className="mt-2 text-lg font-extrabold">Your numbers, in your inbox.</h2><p className="mt-2 max-w-md text-[11px] leading-5 text-white/55">Send a clean stock brief to {workspace.settings.reportEmail}. The report is generated from the current database at send time and sent by Tafadzwa Wilson Sedze.</p><button type="button" disabled={sending} onClick={() => void send()} className="mt-5 flex min-h-11 items-center gap-2 rounded-[14px] bg-accent px-4 text-[11px] font-extrabold text-accent-ink"><Mail className="size-4" /> {sending ? "Sending report..." : "Email stock brief"}</button></section>
      </div>
    </>
  );
}
