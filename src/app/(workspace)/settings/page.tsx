'use client';

import { useRef, useState } from "react";
import { Building2, Check, ImagePlus, Languages, Mail, Palette, Send, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useWorkspace } from "@/components/workspace-provider";
import type { AppSettings } from "@/lib/app-types";
import { resizeLogoFile } from "@/lib/logo";

export default function SettingsPage() {
  const { currentUser, workspace, updateSettings, emailReport } = useWorkspace();
  if (currentUser?.role !== "OWNER") return <><AppHeader title="Workspace" description="Owner access is required." /><div className="app-card rounded-[22px] p-6 text-xs text-muted">You do not have permission to change workspace settings.</div></>;
  return <SettingsForm key={JSON.stringify(workspace.settings)} initial={workspace.settings} onSave={updateSettings} onSendTest={emailReport} />;
}

type Result = { ok: boolean; message: string };

function SettingsForm({ initial, onSave, onSendTest }: { initial: AppSettings; onSave: (settings: AppSettings) => Promise<Result>; onSendTest: () => Promise<Result> }) {
  const [form, setForm] = useState<AppSettings>(initial);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const reportEmailChanged = form.reportEmail.trim().toLowerCase() !== initial.reportEmail.trim().toLowerCase();
  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoError("");
    try { const logoUrl = await resizeLogoFile(file); setForm((current) => ({ ...current, logoUrl })); }
    catch (error) { setLogoError(error instanceof Error ? error.message : "That image could not be used."); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  };
  const sendTest = async () => { setSendingTest(true); const result = await onSendTest(); setSendingTest(false); setMessage(result.message); };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    // Only send the logo when it changed, so unrelated saves never touch it.
    const payload: Partial<AppSettings> = { ...form };
    if (form.logoUrl === initial.logoUrl) delete payload.logoUrl;
    const result = await onSave(payload as AppSettings);
    setSaving(false);
    setMessage(result.message);
  };
  return (
    <>
      <AppHeader title="Workspace" description="Brand, shop details and report delivery for your business." />
      {message ? <div className="mb-3 flex items-center gap-2 rounded-[14px] bg-primary/7 px-3 py-2.5 text-[11px] text-primary"><Check className="size-3.5" />{message}</div> : null}
      <form onSubmit={save} className="grid gap-3 xl:grid-cols-[1fr_.8fr]">
        <section className="app-card rounded-[22px] p-4">
          <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-[14px] bg-accent text-primary"><Palette className="size-4" /></span><div><p className="eyebrow">Identity</p><h2 className="mt-1 text-sm font-extrabold">Make it yours</h2></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5"><span className="text-[10px] font-bold text-muted">App name</span><input required className="field w-full rounded-[14px] px-3 text-xs" value={form.appName} onChange={(event) => setForm((current) => ({ ...current, appName: event.target.value }))} /><p className="text-[8px] text-muted">Used in navigation, page titles and reports.</p></label>
            <label className="space-y-1.5"><span className="text-[10px] font-bold text-muted">Business name</span><input required className="field w-full rounded-[14px] px-3 text-xs" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} /></label>
            <label className="space-y-1.5"><span className="text-[10px] font-bold text-muted">Shop name</span><input required className="field w-full rounded-[14px] px-3 text-xs" value={form.shopName} onChange={(event) => setForm((current) => ({ ...current, shopName: event.target.value }))} /></label>
            <label className="space-y-1.5"><span className="text-[10px] font-bold text-muted">Shop code</span><input required className="field w-full rounded-[14px] px-3 text-xs uppercase" value={form.shopCode} onChange={(event) => setForm((current) => ({ ...current, shopCode: event.target.value.toUpperCase() }))} /></label>
            <label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold text-muted">Shop location</span><input className="field w-full rounded-[14px] px-3 text-xs" placeholder="Town, suburb or market" value={form.shopLocation} onChange={(event) => setForm((current) => ({ ...current, shopLocation: event.target.value }))} /></label>
            <label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold text-muted">Send email reports to</span><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input required type="email" className="field w-full rounded-[14px] pl-9 pr-3 text-xs" value={form.reportEmail} onChange={(event) => setForm((current) => ({ ...current, reportEmail: event.target.value }))} /></div><p className="text-[8px] text-muted">Daily stock reports go to this address. Change it to any inbox you like, then save.</p></label>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2"><button type="button" disabled={sendingTest || reportEmailChanged} onClick={() => void sendTest()} className="flex min-h-10 items-center gap-2 rounded-[14px] border border-border bg-surface-soft px-3 text-[11px] font-extrabold text-primary disabled:opacity-50"><Send className="size-3.5" />{sendingTest ? "Sending..." : "Send a test report"}</button>{reportEmailChanged ? <span className="text-[9px] text-muted">Save the workspace first to test the new address.</span> : null}</div>
          </div>
        </section>
        <section className="app-card rounded-[22px] p-4"><p className="eyebrow">Shop logo</p><div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-soft p-3"><span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[18px] border border-border bg-surface">{form.logoUrl ? <img src={form.logoUrl} alt="Shop logo" className="size-full object-contain" /> : <ImagePlus className="size-6 text-muted" />}</span><div className="min-w-0 flex-1"><p className="text-[11px] font-bold">{form.logoUrl ? "Logo ready" : "No logo yet"}</p><p className="text-[9px] text-muted">PNG, JPG, WebP or SVG. Shown in the menu and on phones.</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 rounded-xl bg-primary px-2.5 py-1.5 text-[10px] font-extrabold text-white"><ImagePlus className="size-3.5" />{form.logoUrl ? "Change logo" : "Upload logo"}</button>{form.logoUrl ? <button type="button" onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))} className="flex items-center gap-1.5 rounded-xl border border-danger/20 bg-danger/7 px-2.5 py-1.5 text-[10px] font-extrabold text-danger"><Trash2 className="size-3.5" />Remove</button> : null}</div></div><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(event) => void pickLogo(event.target.files?.[0])} /></div>{logoError ? <p className="mt-2 text-[10px] text-danger">{logoError}</p> : null}{form.logoUrl !== initial.logoUrl ? <p className="mt-2 text-[9px] text-muted">Click &quot;Save workspace&quot; to apply the logo.</p> : null}<p className="eyebrow mt-5">Preferences</p><div className="mt-3 space-y-2"><label className="flex items-center gap-3 rounded-2xl bg-surface-soft p-3"><span className="grid size-8 place-items-center rounded-xl bg-surface text-brand-text"><Languages className="size-4" /></span><div className="flex-1"><p className="text-[11px] font-bold">Language</p><p className="text-[9px] text-muted">Interface preference</p></div><select className="rounded-xl border border-border bg-surface px-2 py-2 text-[10px] font-bold" value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value as "en" | "sn" }))}><option value="en">English</option><option value="sn">Shona</option></select></label><label className="flex items-center gap-3 rounded-2xl bg-surface-soft p-3"><span className="grid size-8 place-items-center rounded-xl bg-surface text-brand-text"><Building2 className="size-4" /></span><div className="flex-1"><p className="text-[11px] font-bold">Instant autosave</p><p className="text-[9px] text-muted">Confirm every change to the database</p></div><input type="checkbox" className="size-4 accent-primary" checked={form.enableAutoSave} onChange={(event) => setForm((current) => ({ ...current, enableAutoSave: event.target.checked }))} /></label></div><button disabled={saving} className="primary-button mt-4 w-full px-4 text-xs">{saving ? "Saving changes..." : "Save workspace"}</button></section>
      </form>
    </>
  );
}
