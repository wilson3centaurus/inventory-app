'use client';

import { useState } from "react";
import { Barcode, Boxes, ChevronRight, CircleAlert, Mic, PackagePlus, Search, SlidersHorizontal, X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useWorkspace } from "@/components/workspace-provider";

const emptyForm = { name: "", category: "", barcode: "", sku: "", supplier: "", costPrice: "", sellingPrice: "", stock: "", minStock: "", expiryDate: "" };
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function parseVoiceStockEntry(transcript: string) {
  const cleaned = transcript.replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  const quantityMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  const quantity = quantityMatch?.[1] ?? "";
  let name = cleaned
    .replace(/^add\s+/i, "")
    .replace(/^record\s+/i, "")
    .replace(/^enter\s+/i, "")
    .replace(/^stock\s+/i, "")
    .replace(/^(\d+(?:\.\d+)?)\s*/i, "")
    .trim();

  name = name.replace(/^(units?|items?|packs?|bags?|boxes?|bottles?|cans?|cartons?)\s+of\s+/i, "").trim();
  return { quantity, name: name ? name.charAt(0).toUpperCase() + name.slice(1) : "" };
}

export default function InventoryPage() {
  const { workspace, addProduct } = useWorkspace();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const speechSupported = Boolean(getSpeechRecognitionConstructor());
  const products = workspace.products.filter((product) => (filter === "all" || product.stock <= product.minStock) && `${product.name} ${product.sku} ${product.barcode}`.toLowerCase().includes(query.toLowerCase()));
  const lowCount = workspace.products.filter((product) => product.stock <= product.minStock).length;

  const capture = (code: string) => {
    const existing = workspace.products.find((product) => product.barcode === code);
    if (existing) {
      setQuery(code);
      setFeedback(`${existing.name} found in inventory.`);
    } else {
      setForm((current) => ({ ...current, barcode: code }));
      setShowForm(true);
      setFeedback("Code captured. Complete the product details.");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const result = await addProduct({
      name: form.name, category: form.category, barcode: form.barcode, sku: form.sku, supplier: form.supplier,
      costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice), stock: Number(form.stock), minStock: Number(form.minStock), expiryDate: form.expiryDate || undefined,
    });
    setSaving(false);
    setFeedback(result.message);
    if (result.ok) { setForm(emptyForm); setShowForm(false); }
  };

  const startVoiceEntry = () => {
    const speechApi = getSpeechRecognitionConstructor();
    if (!speechApi) {
      setFeedback("Voice entry is only supported in browsers with speech recognition.");
      return;
    }

    const recognition = new speechApi();
    recognition.lang = "en-ZW";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      const parsed = parseVoiceStockEntry(transcript);
      setShowForm(true);
      setForm((current) => ({
        ...current,
        name: parsed.name || current.name,
        stock: parsed.quantity || current.stock,
      }));
      setFeedback(transcript ? `Voice captured: "${transcript}"` : "Voice captured. Review the form before saving.");
      setListening(false);
    };
    recognition.onerror = () => {
      setFeedback("Voice entry could not be completed. Please try again.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <>
      <AppHeader title="Inventory" description={`${workspace.products.length} products across your live workspace.`} action={<div className="hidden items-center gap-2 sm:flex"><button type="button" onClick={startVoiceEntry} className="flex h-10 items-center gap-2 rounded-[14px] border border-border bg-surface px-3 text-[11px] font-extrabold text-brand-text disabled:opacity-55" disabled={!speechSupported || listening}><Mic className="size-4" /> {listening ? "Listening..." : "Voice"}</button><button type="button" onClick={() => setShowScanner(true)} className="flex h-10 items-center gap-2 rounded-[14px] bg-accent px-3 text-[11px] font-extrabold text-accent-ink"><Barcode className="size-4" /> Scan</button></div>} />

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input className="field w-full rounded-[15px] pl-9 pr-3 text-xs" placeholder="Search name, SKU or barcode" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <button aria-label="Scan barcode" type="button" onClick={() => setShowScanner(true)} className="grid size-11 place-items-center rounded-[15px] bg-primary text-white sm:hidden"><Barcode className="size-[18px]" /></button>
        <button aria-label="Voice entry" type="button" onClick={startVoiceEntry} className="grid size-11 place-items-center rounded-[15px] border border-border bg-surface text-brand-text sm:hidden disabled:opacity-55" disabled={!speechSupported || listening}><Mic className={`size-[18px] ${listening ? "animate-pulse" : ""}`} /></button>
        <button aria-label="Add product" type="button" onClick={() => setShowForm(true)} className="grid size-11 place-items-center rounded-[15px] bg-accent text-accent-ink sm:w-auto sm:px-4"><PackagePlus className="size-[18px]" /><span className="ml-2 hidden text-xs font-extrabold sm:inline">Add product</span></button>
      </div>
      {feedback ? <button type="button" onClick={() => setFeedback("")} className="mt-2 flex w-full items-center justify-between rounded-xl bg-primary/6 px-3 py-2 text-left text-[10px] text-primary"><span>{feedback}</span><X className="size-3" /></button> : null}

      <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <button type="button" onClick={() => setFilter("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${filter === "all" ? "bg-primary text-white" : "border border-border bg-surface text-muted"}`}>All items · {workspace.products.length}</button>
        <button type="button" onClick={() => setFilter("low")} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${filter === "low" ? "bg-danger text-white" : "border border-border bg-surface text-muted"}`}>Low stock · {lowCount}</button>
        <span className="ml-auto hidden items-center gap-1 text-[10px] text-muted sm:flex"><SlidersHorizontal className="size-3" /> Live stock</span>
      </div>

      <section className="app-card mt-3 overflow-hidden rounded-[22px]">
        {products.length ? <div className="divide-y divide-border/80">{products.map((product) => {
          const low = product.stock <= product.minStock;
          return <article key={product.id} className="flex items-center gap-3 px-3 py-3 transition hover:bg-surface-soft sm:px-4"><div className={`grid size-11 shrink-0 place-items-center rounded-[15px] ${low ? "bg-danger/8 text-danger" : "bg-primary/7 text-primary"}`}><Boxes className="size-[18px]" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-xs font-extrabold">{product.name}</p>{low ? <CircleAlert className="size-3 shrink-0 text-danger" /> : null}</div><p className="mt-1 truncate font-mono text-[9px] text-muted">{product.sku}{product.barcode ? ` · ${product.barcode}` : ""}</p><p className="mt-1 text-[9px] text-muted">{product.category} · {money.format(product.sellingPrice)}</p></div><div className="text-right"><p className={`text-base font-extrabold ${low ? "text-danger" : ""}`}>{product.stock}</p><p className="text-[8px] uppercase tracking-wide text-muted">in stock</p></div><ChevronRight className="size-3.5 text-muted/50" /></article>;
        })}</div> : <div className="grid min-h-64 place-items-center px-6 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-[18px] bg-primary/7 text-primary"><Boxes className="size-5" /></span><h2 className="mt-3 text-sm font-extrabold">{workspace.products.length ? "No matching products" : "Your shelves are ready"}</h2><p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-muted">{workspace.products.length ? "Try a different search or stock filter." : "Scan a barcode or add your first product to the live database."}</p>{!workspace.products.length ? <button type="button" onClick={() => setShowForm(true)} className="primary-button mt-4 px-4 text-xs">Add first product</button> : null}</div></div>}
      </section>

      {showForm ? <div className="fixed inset-0 z-[70] flex items-end bg-primary/45 p-2 backdrop-blur-sm mobile-sheet-padding sm:items-center sm:justify-center"><form onSubmit={submit} className="max-h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom))] w-full overflow-y-auto rounded-[26px] bg-surface p-4 shadow-2xl sm:max-h-[92dvh] sm:max-w-2xl sm:p-5"><div className="sticky top-0 z-10 flex items-center justify-between bg-surface pb-3"><div><p className="eyebrow">Live inventory</p><h2 className="mt-1 text-lg font-extrabold">Add product</h2></div><div className="flex items-center gap-2"><button type="button" onClick={startVoiceEntry} className="flex min-h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[10px] font-bold text-brand-text disabled:opacity-55" disabled={!speechSupported || listening}><Mic className="size-3.5" /> {listening ? "Listening..." : "Voice"}</button><button aria-label="Close" type="button" onClick={() => setShowForm(false)} className="grid size-9 place-items-center rounded-xl bg-surface-strong"><X className="size-4" /></button></div></div><div className="grid gap-3 sm:grid-cols-2">{[
          ["name", "Product name", "e.g. Mazoe Orange 2L", "text"], ["barcode", "Barcode / QR", "Scan or enter code", "text"], ["sku", "SKU", "Unique stock code", "text"], ["category", "Category", "Groceries", "text"], ["supplier", "Supplier", "Supplier name", "text"], ["costPrice", "Cost price", "0.00", "number"], ["sellingPrice", "Selling price", "0.00", "number"], ["stock", "Opening stock", "0", "number"], ["minStock", "Low-stock level", "0", "number"], ["expiryDate", "Expiry date", "", "date"],
        ].map(([key, label, placeholder, type]) => <label key={key} className="space-y-1.5"><span className="text-[10px] font-bold text-muted">{label}</span><input required={key === "name" || key === "sku"} type={type} step={type === "number" ? "0.01" : undefined} className="field w-full rounded-[14px] px-3 text-xs" placeholder={placeholder} value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div><div className="mt-4 flex gap-2"><button type="button" onClick={() => setShowScanner(true)} className="flex min-h-11 items-center gap-2 rounded-[14px] border border-border px-4 text-xs font-bold"><Barcode className="size-4" /> Scan</button><button disabled={saving} className="primary-button flex-1 px-4 text-xs">{saving ? "Saving to database..." : "Save product"}</button></div></form></div> : null}
      <BarcodeScanner open={showScanner} onClose={() => setShowScanner(false)} onCapture={capture} />
    </>
  );
}
