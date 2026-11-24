'use client';

import { useEffect, useRef, useState } from "react";
import { Barcode, Check, LoaderCircle, Minus, Plus, Search, ShoppingBag, Smartphone, Trash2, X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useWorkspace } from "@/components/workspace-provider";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function SalesPage() {
  const { workspace, recordSale, startEcoCash, checkEcoCash } = useWorkspace();
  const [ecocashPhone, setEcocashPhone] = useState("");
  const [pending, setPending] = useState<{ ticket: string; message: string } | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"ok" | "error">("ok");
  const polling = useRef(false);
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

  const finish = (ok: boolean, message: string) => {
    setFeedback(message);
    setFeedbackTone(ok ? "ok" : "error");
    if (ok) { setCart([]); setCustomerName(""); setEcocashPhone(""); }
  };

  const complete = async () => {
    setSaving(true);
    if (paymentMethod === "EcoCash") {
      const started = await startEcoCash({ phone: ecocashPhone, customerName, items: cart });
      setSaving(false);
      if (!started.ok || !started.ticket) { finish(false, started.message); return; }
      setFeedback("");
      setPending({ ticket: started.ticket, message: started.message });
      return;
    }
    const result = await recordSale({ customerName, paymentMethod, items: cart });
    setSaving(false);
    finish(result.ok, result.message);
  };

  // Poll Paynow every 4 seconds while an EcoCash prompt is open (one request at a time).
  const pendingTicket = pending?.ticket;
  useEffect(() => {
    if (!pendingTicket) return;
    let cancelled = false;
    const tick = async () => {
      if (polling.current || cancelled) return;
      polling.current = true;
      const result = await checkEcoCash(pendingTicket);
      polling.current = false;
      if (cancelled) return;
      if (result.state === "pending" || result.state === "error") { setPending((current) => current && { ...current, message: result.message }); return; }
      setPending(null);
      setFeedback(result.message);
      setFeedbackTone(result.state === "paid" ? "ok" : "error");
      if (result.state === "paid") { setCart([]); setCustomerName(""); setEcocashPhone(""); }
    };
    const timer = window.setInterval(() => void tick(), 4000);
    void tick();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [pendingTicket, checkEcoCash]);

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
      {feedback ? <div className={`mb-3 flex items-center gap-2 rounded-[14px] px-3 py-2.5 text-[11px] font-semibold ${feedbackTone === "ok" ? "bg-primary text-white" : "bg-danger/10 text-danger"}`}>{feedbackTone === "ok" ? <Check className="size-3.5 text-accent" /> : <X className="size-3.5" />}<span className="flex-1">{feedback}</span><button type="button" aria-label="Dismiss" onClick={() => setFeedback("")}><X className="size-3.5 opacity-60" /></button></div> : null}
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
            {paymentMethod === "EcoCash" ? <div className="relative mt-2"><Smartphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input aria-label="Customer EcoCash number" inputMode="tel" autoComplete="tel" className="field w-full rounded-[14px] pl-9 pr-3 text-xs" placeholder="Customer EcoCash number, e.g. 0771234567" value={ecocashPhone} onChange={(event) => setEcocashPhone(event.target.value)} /></div> : null}
            <div className="my-3 flex items-end justify-between"><div><p className="eyebrow">Amount due</p><p className="mt-1 text-[10px] text-muted">{paymentMethod} payment</p></div><p className="text-2xl font-extrabold tracking-[-.04em]">{money.format(total)}</p></div>
            <button type="button" disabled={!cart.length || saving || Boolean(pending) || (paymentMethod === "EcoCash" && ecocashPhone.replace(/\D/g, "").length < 9)} onClick={() => void complete()} className="primary-button w-full px-4 text-xs">{saving ? (paymentMethod === "EcoCash" ? "Sending EcoCash prompt..." : "Completing transaction...") : paymentMethod === "EcoCash" ? `Request ${money.format(total)} via EcoCash` : `Charge ${money.format(total)}`}</button>
          </div>
        </aside>
      </div>
      {pending ? <div className="fixed inset-0 z-[80] grid place-items-center bg-primary/50 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[26px] bg-surface p-6 text-center shadow-2xl"><span className="mx-auto grid size-14 place-items-center rounded-[20px] bg-accent text-accent-ink"><Smartphone className="size-6" /></span><h2 className="mt-4 text-lg font-extrabold">Waiting for EcoCash</h2><p className="mt-1 text-2xl font-extrabold tracking-tight">{money.format(total)}</p><p className="mt-3 flex items-center justify-center gap-2 text-[11px] leading-5 text-muted"><LoaderCircle className="size-4 shrink-0 animate-spin" />{pending.message}</p><p className="mt-3 text-[9px] text-muted">The sale is saved automatically once the payment is confirmed.</p><button type="button" onClick={() => { setPending(null); finish(false, "Stopped waiting for EcoCash. If the customer already paid, check Paynow before charging again."); }} className="mt-5 w-full rounded-[14px] border border-border px-4 py-2.5 text-[11px] font-bold text-muted">Stop waiting</button></div></div> : null}
      <BarcodeScanner open={scanner} onClose={() => setScanner(false)} onCapture={captured} />
    </>
  );
}
