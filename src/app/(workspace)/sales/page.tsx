'use client';

import { useState } from "react";
import { Barcode, Check, Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useWorkspace } from "@/components/workspace-provider";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function SalesPage() {
  const { workspace, recordSale } = useWorkspace();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [scanner, setScanner] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const products = workspace.products.filter((product) => product.stock > 0 && `${product.name} ${product.sku} ${product.barcode}`.toLowerCase().includes(query.toLowerCase()));

  const changeQuantity = (productId: string, change: number) => {
    const product = workspace.products.find((entry) => entry.id === productId);
    setCart((current) => {
      const existing = current.find((entry) => entry.productId === productId);
      if (!existing) return change > 0 ? [...current, { productId, quantity: 1 }] : current;
      const quantity = Math.min(existing.quantity + change, product?.stock ?? existing.quantity);
      return quantity <= 0 ? current.filter((entry) => entry.productId !== productId) : current.map((entry) => entry.productId === productId ? { ...entry, quantity } : entry);
    });
  };
  const total = cart.reduce((sum, line) => { const product = workspace.products.find((entry) => entry.id === line.productId); return sum + (product?.sellingPrice ?? 0) * line.quantity; }, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const complete = async () => {
    setSaving(true);
    const result = await recordSale({ customerName, paymentMethod, items: cart });
    setSaving(false);
    setFeedback(result.message);
    if (result.ok) { setCart([]); setCustomerName(""); }
  };

  const captured = (code: string) => {
    const product = workspace.products.find((entry) => entry.barcode === code);
    if (!product) { setQuery(code); setFeedback("No product uses that barcode yet."); return; }
    if (product.stock <= 0) { setFeedback(`${product.name} is out of stock.`); return; }
    changeQuantity(product.id, 1);
    setFeedback(`${product.name} added.`);
  };

  return (
    <>
      <AppHeader title="New sale" description="Scan, tap, charge. Stock updates instantly." />
      {feedback ? <div className="mb-3 flex items-center gap-2 rounded-[14px] bg-primary px-3 py-2.5 text-[11px] font-semibold text-white"><Check className="size-3.5 text-accent" />{feedback}</div> : null}
      <div className="grid gap-3 xl:grid-cols-[1.15fr_.85fr]">
        <section className="app-card rounded-[22px] p-3 sm:p-4">
          <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input className="field w-full rounded-[14px] pl-9 pr-3 text-xs" placeholder="Search products" value={query} onChange={(event) => setQuery(event.target.value)} /></div><button type="button" aria-label="Scan item" onClick={() => setScanner(true)} className="grid size-11 place-items-center rounded-[14px] bg-accent text-accent-ink"><Barcode className="size-[18px]" /></button></div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
            {products.length ? products.slice(0, 24).map((product) => {
              const line = cart.find((entry) => entry.productId === product.id);
              return <button type="button" onClick={() => changeQuantity(product.id, 1)} key={product.id} className={`relative min-h-28 rounded-[18px] border p-3 text-left transition active:scale-[.98] ${line ? "border-primary bg-primary text-white" : "border-border bg-surface-soft hover:border-primary/30"}`}><span className={`grid size-8 place-items-center rounded-xl ${line ? "bg-white/10" : "bg-primary/7 text-primary"}`}><ShoppingBag className="size-4" /></span><p className="mt-3 line-clamp-2 text-[11px] font-extrabold leading-4">{product.name}</p><div className="mt-2 flex items-end justify-between"><p className={`text-xs font-extrabold ${line ? "text-accent" : "text-primary"}`}>{money.format(product.sellingPrice)}</p><p className={`text-[8px] ${line ? "text-white/50" : "text-muted"}`}>{product.stock} left</p></div>{line ? <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-extrabold text-accent-ink">{line.quantity}</span> : null}</button>;
            }) : <div className="col-span-full grid min-h-52 place-items-center text-center"><div><ShoppingBag className="mx-auto size-7 text-muted/50" /><p className="mt-2 text-xs font-bold">{workspace.products.length ? "No matching product" : "Add inventory before recording sales"}</p><p className="mt-1 text-[10px] text-muted">Only in-stock products appear at checkout.</p></div></div>}
          </div>
        </section>

        <aside className="app-card flex min-h-[360px] flex-col rounded-[22px] p-4 xl:sticky xl:top-4 xl:h-[calc(100dvh-2rem)]">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Current basket</p><h2 className="mt-1 text-sm font-extrabold">{itemCount} {itemCount === 1 ? "item" : "items"}</h2></div>{cart.length ? <button type="button" onClick={() => setCart([])} className="flex items-center gap-1 text-[10px] font-bold text-danger"><Trash2 className="size-3" /> Clear</button> : null}</div>
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
            {cart.length ? cart.map((line) => {
              const product = workspace.products.find((entry) => entry.id === line.productId);
              if (!product) return null;
              return <div key={line.productId} className="flex items-center gap-2 border-b border-border py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold">{product.name}</p><p className="mt-0.5 text-[9px] text-muted">{money.format(product.sellingPrice)} each</p></div><div className="flex items-center rounded-xl bg-surface-strong p-0.5"><button aria-label={`Remove one ${product.name}`} type="button" onClick={() => changeQuantity(product.id, -1)} className="grid size-7 place-items-center rounded-lg"><Minus className="size-3" /></button><span className="w-6 text-center text-[10px] font-extrabold">{line.quantity}</span><button aria-label={`Add one ${product.name}`} type="button" onClick={() => changeQuantity(product.id, 1)} className="grid size-7 place-items-center rounded-lg"><Plus className="size-3" /></button></div><p className="w-14 text-right text-[11px] font-extrabold">{money.format(product.sellingPrice * line.quantity)}</p></div>;
            }) : <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-border text-center"><div><ShoppingBag className="mx-auto size-6 text-muted/40" /><p className="mt-2 text-[10px] text-muted">Tap a product or scan a barcode</p></div></div>}
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <input aria-label="Customer name" className="field w-full rounded-[14px] px-3 text-xs" placeholder="Customer name (optional)" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            <div className="mt-2 grid grid-cols-4 gap-1.5">{["Cash", "EcoCash", "Card", "Credit"].map((method) => <button type="button" key={method} onClick={() => setPaymentMethod(method)} className={`rounded-xl px-1 py-2 text-[9px] font-bold ${paymentMethod === method ? "bg-primary text-white" : "bg-surface-strong text-muted"}`}>{method}</button>)}</div>
            <div className="my-3 flex items-end justify-between"><div><p className="eyebrow">Amount due</p><p className="mt-1 text-[10px] text-muted">{paymentMethod} payment</p></div><p className="text-2xl font-extrabold tracking-[-.04em]">{money.format(total)}</p></div>
            <button type="button" disabled={!cart.length || saving} onClick={() => void complete()} className="primary-button w-full px-4 text-xs">{saving ? "Completing transaction..." : `Charge ${money.format(total)}`}</button>
          </div>
        </aside>
      </div>
      <BarcodeScanner open={scanner} onClose={() => setScanner(false)} onCapture={captured} />
    </>
  );
}
