'use client';

import { useState } from "react";
import { Minus, PackageCheck, Plus, X } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import type { Product } from "@/lib/app-types";

type Mode = "RESTOCK" | "DAMAGE" | "COUNT";

export function ProductSheet({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: (message: string) => void }) {
  const { updateProduct } = useWorkspace();
  const [mode, setMode] = useState<Mode>("RESTOCK");
  const [quantity, setQuantity] = useState("");
  const [details, setDetails] = useState({
    name: product.name,
    barcode: product.barcode,
    costPrice: String(product.costPrice),
    sellingPrice: String(product.sellingPrice),
    minStock: String(product.minStock),
    expiryDate: product.expiryDate?.slice(0, 10) ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const amount = Number(quantity || 0);
  const stockChange = mode === "RESTOCK" ? amount : mode === "DAMAGE" ? -amount : quantity === "" ? 0 : amount - product.stock;
  const newBalance = product.stock + stockChange;

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (quantity !== "" && (!Number.isFinite(amount) || amount < 0)) { setError("Enter a quantity of zero or more."); return; }
    if (newBalance < 0) { setError(`Only ${product.stock} in stock.`); return; }
    setSaving(true);
    setError("");
    const result = await updateProduct({
      id: product.id,
      name: details.name,
      barcode: details.barcode,
      costPrice: Number(details.costPrice || 0),
      sellingPrice: Number(details.sellingPrice || 0),
      minStock: Number(details.minStock || 0),
      expiryDate: details.expiryDate || null,
      stockChange,
      reason: mode,
    });
    setSaving(false);
    if (!result.ok) { setError(result.message); return; }
    onDone(result.message);
  };

  const modes: Array<[Mode, string, typeof Plus]> = [["RESTOCK", "Add stock", Plus], ["DAMAGE", "Remove damaged", Minus], ["COUNT", "Set exact count", PackageCheck]];
  const fields: Array<[keyof typeof details, string, string]> = [["name", "Product name", "text"], ["barcode", "Barcode", "text"], ["costPrice", "Cost price", "number"], ["sellingPrice", "Selling price", "number"], ["minStock", "Low-stock level", "number"], ["expiryDate", "Expiry date", "date"]];

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-primary/45 p-2 backdrop-blur-sm mobile-sheet-padding sm:items-center sm:justify-center">
      <form onSubmit={save} className="max-h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom))] w-full overflow-y-auto rounded-[26px] bg-surface p-4 shadow-2xl sm:max-h-[92dvh] sm:max-w-xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="eyebrow">{product.sku}</p><h2 className="mt-1 truncate text-lg font-extrabold">{product.name}</h2><p className="mt-0.5 text-[11px] text-muted">{product.stock} in stock now</p></div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-surface-strong"><X className="size-4" /></button>
        </div>

        <p className="eyebrow mt-4">Stock</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {modes.map(([value, label, Icon]) => <button key={value} type="button" onClick={() => { setMode(value); setQuantity(""); }} className={`flex items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold ${mode === value ? "bg-primary text-white" : "bg-surface-strong text-muted"}`}><Icon className="size-3" />{label}</button>)}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input type="number" min="0" step="1" inputMode="numeric" className="field w-full rounded-[14px] px-3 text-sm font-bold" placeholder={mode === "COUNT" ? "Counted quantity" : "Quantity"} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <div className="shrink-0 text-right"><p className="text-[9px] uppercase text-muted">New balance</p><p className={`text-lg font-extrabold ${newBalance < 0 ? "text-danger" : ""}`}>{newBalance}</p></div>
        </div>

        <p className="eyebrow mt-5">Details</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label, type]) => <label key={key} className={`space-y-1.5 ${key === "name" ? "sm:col-span-2" : ""}`}><span className="text-[10px] font-bold text-muted">{label}</span><input required={key === "name"} type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} className="field w-full rounded-[14px] px-3 text-xs" value={details[key]} onChange={(event) => setDetails((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
        </div>

        {error ? <p className="mt-3 rounded-xl bg-danger/8 px-3 py-2 text-[11px] text-danger">{error}</p> : null}
        <button disabled={saving} className="primary-button mt-4 w-full px-4 text-xs">{saving ? "Saving..." : "Save changes"}</button>
      </form>
    </div>
  );
}
