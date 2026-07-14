'use client';

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Barcode, Boxes, CircleDollarSign, Clock3, PackageCheck, ShoppingBasket, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useWorkspace } from "@/components/workspace-provider";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function Empty({ text }: { text: string }) {
  return <div className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-border bg-surface-soft px-5 text-center text-xs text-muted">{text}</div>;
}

export default function DashboardPage() {
  const { workspace, currentUser } = useWorkspace();
  const [now] = useState(() => Date.now());
  const todayKey = new Date().toDateString();
  const todaySales = workspace.sales.filter((sale) => new Date(sale.createdAt).toDateString() === todayKey);
  const revenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const profit = todaySales.reduce((sum, sale) => sum + sale.totalProfit, 0);
  const inventoryValue = workspace.products.reduce((sum, item) => sum + item.stock * item.costPrice, 0);
  const lowStock = workspace.products.filter((item) => item.stock <= item.minStock);
  const expiring = workspace.products.filter((item) => item.expiryDate && new Date(item.expiryDate).getTime() < now + 30 * 86400000);
  const lastSeven = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const total = workspace.sales.filter((sale) => new Date(sale.createdAt).toDateString() === date.toDateString()).reduce((sum, sale) => sum + sale.totalAmount, 0);
    return { day: date.toLocaleDateString("en", { weekday: "narrow" }), total };
  });
  const peak = Math.max(...lastSeven.map((day) => day.total), 1);
  const suggestions = workspace.suggestions.length ? workspace.suggestions : lowStock.slice(0, 3).map((item) => `${item.name} has reached ${item.stock} units. Restock to stay above the ${item.minStock} unit threshold.`);

  return (
    <>
      <AppHeader title={`Hi, ${currentUser?.fullName.split(" ")[0] ?? "there"}`} description="Here is your shop pulse for today." />

      <section className="relative overflow-hidden rounded-[24px] bg-primary p-4 text-white shadow-[0_18px_50px_rgba(14,45,38,.16)] sm:p-5">
        <div className="absolute -right-10 -top-14 size-44 rounded-full border-[26px] border-accent/10" />
        <div className="relative flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/50">Today&apos;s takings</p><p className="mt-1 text-[30px] font-extrabold tracking-[-.05em] sm:text-4xl">{money.format(revenue)}</p><p className="mt-1 text-[11px] text-white/55">{todaySales.length} {todaySales.length === 1 ? "sale" : "sales"} recorded</p></div>
          <Link href="/sales" className="flex items-center gap-1.5 rounded-[14px] bg-accent px-3 py-2 text-[11px] font-extrabold text-accent-ink"><ShoppingBasket className="size-3.5" /> New sale</Link>
        </div>
        <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3">
          <div><p className="text-[9px] uppercase text-white/45">Profit</p><p className="mt-1 text-sm font-bold">{money.format(profit)}</p></div>
          <div className="pl-3"><p className="text-[9px] uppercase text-white/45">Stock value</p><p className="mt-1 text-sm font-bold">{money.format(inventoryValue)}</p></div>
          <div className="pl-3"><p className="text-[9px] uppercase text-white/45">Products</p><p className="mt-1 text-sm font-bold">{workspace.products.length}</p></div>
        </div>
      </section>

      <div className="stagger mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Low stock", value: lowStock.length, note: "Needs attention", icon: TriangleAlert, tone: "bg-[#fff4de] text-[#9d6410]" },
          { label: "Expiring soon", value: expiring.length, note: "Next 30 days", icon: Clock3, tone: "bg-[#ffe9e4] text-danger" },
          { label: "Healthy stock", value: Math.max(workspace.products.length - lowStock.length, 0), note: "Above minimum", icon: PackageCheck, tone: "bg-[#e8f5e7] text-primary" },
          { label: "Units on hand", value: workspace.products.reduce((sum, item) => sum + item.stock, 0), note: "All locations", icon: Boxes, tone: "bg-[#edf0ff] text-[#4957a5]" },
        ].map(({ label, value, note, icon: Icon, tone }) => <div key={label} className="app-card rounded-[20px] p-3.5"><div className={`grid size-8 place-items-center rounded-xl ${tone}`}><Icon className="size-4" /></div><div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[10px] font-bold text-muted">{label}</p><p className="mt-0.5 text-xl font-extrabold tracking-tight">{value}</p></div><p className="mb-0.5 hidden text-[9px] text-muted sm:block">{note}</p></div></div>)}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.1fr_.9fr]">
        <section className="app-card rounded-[22px] p-4">
          <div className="flex items-center justify-between"><div><p className="eyebrow">7 day rhythm</p><h2 className="mt-1 text-sm font-extrabold">Sales movement</h2></div><TrendingUp className="size-4 text-primary" /></div>
          <div className="mt-5 flex h-28 items-end gap-2 sm:h-36">
            {lastSeven.map((entry, index) => <div key={`${entry.day}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"><span className="text-[8px] font-bold text-muted">{entry.total ? money.format(entry.total) : ""}</span><div className="w-full max-w-10 rounded-t-[8px] bg-primary/12" style={{ height: `${Math.max((entry.total / peak) * 80, 5)}%` }}><div className="h-full w-full rounded-t-[8px] bg-primary" style={{ opacity: .55 + index * .06 }} /></div><span className="text-[9px] font-bold text-muted">{entry.day}</span></div>)}
          </div>
        </section>

        <section className="app-card rounded-[22px] p-4">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Smart shelf</p><h2 className="mt-1 text-sm font-extrabold">What needs attention</h2></div><Sparkles className="size-4 text-warning" /></div>
          <div className="mt-3 space-y-2">
            {suggestions.length ? suggestions.slice(0, 3).map((suggestion, index) => <div key={suggestion} className="flex gap-3 rounded-2xl bg-surface-soft p-3"><span className="grid size-6 shrink-0 place-items-center rounded-lg bg-accent text-[10px] font-extrabold text-accent-ink">{index + 1}</span><p className="text-[11px] leading-5 text-muted">{suggestion}</p></div>) : <Empty text="StockFlow will surface recommendations as your real sales and stock history grows." />}
          </div>
        </section>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[.9fr_1.1fr]">
        <section className="app-card rounded-[22px] p-4">
          <p className="eyebrow">Quick moves</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[{ href: "/inventory", label: "Scan item", icon: Barcode }, { href: "/sales", label: "Record sale", icon: CircleDollarSign }, { href: "/inventory", label: "Add stock", icon: Boxes }].map(({ href, label, icon: Icon }) => <Link key={label} href={href} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface-soft text-center text-[10px] font-bold transition hover:border-primary/30"><Icon className="size-[18px] text-primary" />{label}</Link>)}
          </div>
        </section>
        <section className="app-card rounded-[22px] p-4">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Live ledger</p><h2 className="mt-1 text-sm font-extrabold">Recent sales</h2></div><Link href="/sales" className="flex items-center gap-1 text-[10px] font-bold text-primary">View all <ArrowRight className="size-3" /></Link></div>
          <div className="mt-3 space-y-1">
            {workspace.sales.length ? workspace.sales.slice(0, 4).map((sale) => <div key={sale.id} className="flex items-center gap-3 border-b border-border/70 py-2.5 last:border-0"><span className="grid size-8 place-items-center rounded-xl bg-primary/7"><ShoppingBasket className="size-3.5 text-primary" /></span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold">{sale.customerName}</p><p className="mt-0.5 text-[9px] text-muted">{new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {sale.paymentMethod}</p></div><p className="text-xs font-extrabold">{money.format(sale.totalAmount)}</p></div>) : <Empty text="Your first completed sale will appear here." />}
          </div>
        </section>
      </div>
    </>
  );
}
