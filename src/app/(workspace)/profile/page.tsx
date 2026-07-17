'use client';

import { useState } from "react";
import { Building2, Check, LogOut, Mail, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useWorkspace } from "@/components/workspace-provider";

export default function ProfilePage() {
  const { currentUser, workspace, logout, updateProfile } = useWorkspace();

  if (!currentUser) {
    return (
      <>
        <AppHeader title="My profile" description="Your account and workspace access." />
        <div className="app-card rounded-[22px] p-6 text-xs text-muted">Your profile is still loading.</div>
      </>
    );
  }

  return (
    <ProfileForm
      key={`${currentUser.id}-${workspace.settings.companyName}-${currentUser.email}`}
      currentUser={currentUser}
      companyName={workspace.settings.companyName}
      shopLocation={workspace.settings.shopLocation}
      onLogout={logout}
      onSave={updateProfile}
    />
  );
}

function ProfileForm({
  currentUser,
  companyName,
  shopLocation,
  onLogout,
  onSave,
}: {
  currentUser: {
    fullName: string;
    email: string;
    role: "OWNER" | "EMPLOYEE";
    title: string;
    shop: string;
  };
  companyName: string;
  shopLocation: string;
  onLogout: () => Promise<void>;
  onSave: (updates: {
    fullName: string;
    email: string;
    title: string;
    companyName?: string;
    shopName?: string;
    shopLocation?: string;
  }) => Promise<{ ok: boolean; message: string }>;
}) {
  const isOwner = currentUser.role === "OWNER";
  const [form, setForm] = useState({
    fullName: currentUser.fullName,
    email: currentUser.email,
    title: currentUser.title,
    companyName,
    shopName: currentUser.shop,
    shopLocation,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await onSave({
      fullName: form.fullName,
      email: form.email,
      title: form.title,
      companyName: isOwner ? form.companyName : undefined,
      shopName: isOwner ? form.shopName : undefined,
      shopLocation: isOwner ? form.shopLocation : undefined,
    });
    setSaving(false);
    setMessage(result.message);
  };

  return (
    <>
      <AppHeader title="My profile" description="Update your account details and business identity." />
      {message ? <div className="mb-3 flex items-center gap-2 rounded-[14px] bg-primary/7 px-3 py-2.5 text-[11px] text-primary"><Check className="size-3.5" />{message}</div> : null}
      <div className="grid gap-3 xl:grid-cols-[.85fr_1.15fr]">
        <section className="overflow-hidden rounded-[24px] bg-primary text-white">
          <div className="p-5 sm:p-7">
            <span className="grid size-16 place-items-center rounded-[22px] bg-accent text-xl font-extrabold text-accent-ink">{currentUser.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("") || "SF"}</span>
            <h2 className="mt-4 text-xl font-extrabold">{currentUser.fullName}</h2>
            <p className="mt-1 text-[11px] text-white/50">{currentUser.title}</p>
          </div>
          <div className="grid gap-px bg-white/10 sm:grid-cols-2">
            <div className="flex items-center gap-3 bg-primary p-4"><Mail className="size-4 text-accent" /><div><p className="text-[9px] uppercase text-white/40">Email</p><p className="mt-1 text-[11px] font-bold">{currentUser.email}</p></div></div>
            <div className="flex items-center gap-3 bg-primary p-4"><ShieldCheck className="size-4 text-accent" /><div><p className="text-[9px] uppercase text-white/40">Access</p><p className="mt-1 text-[11px] font-bold">{currentUser.role}</p></div></div>
            <div className="flex items-center gap-3 bg-primary p-4"><Building2 className="size-4 text-accent" /><div><p className="text-[9px] uppercase text-white/40">Business</p><p className="mt-1 text-[11px] font-bold">{companyName}</p></div></div>
            <div className="flex items-center gap-3 bg-primary p-4"><MapPin className="size-4 text-accent" /><div><p className="text-[9px] uppercase text-white/40">Shop</p><p className="mt-1 text-[11px] font-bold">{currentUser.shop}</p></div></div>
          </div>
        </section>

        <form onSubmit={save} className="app-card rounded-[22px] p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-[14px] bg-accent text-primary"><UserRound className="size-4" /></span>
            <div>
              <p className="eyebrow">Editable profile</p>
              <h2 className="mt-1 text-sm font-extrabold">Update your details</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted">Owner name</span>
              <input required className="field w-full rounded-[14px] px-3 text-xs" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted">Account email</span>
              <input required type="email" className="field w-full rounded-[14px] px-3 text-xs" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[10px] font-bold text-muted">Job title</span>
              <input className="field w-full rounded-[14px] px-3 text-xs" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            {isOwner ? (
              <>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted">Business name</span>
                  <input required className="field w-full rounded-[14px] px-3 text-xs" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted">Shop name</span>
                  <input required className="field w-full rounded-[14px] px-3 text-xs" value={form.shopName} onChange={(event) => setForm((current) => ({ ...current, shopName: event.target.value }))} />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] font-bold text-muted">Shop location</span>
                  <input className="field w-full rounded-[14px] px-3 text-xs" placeholder="Town, suburb or market" value={form.shopLocation} onChange={(event) => setForm((current) => ({ ...current, shopLocation: event.target.value }))} />
                </label>
              </>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button disabled={saving} className="primary-button flex-1 px-4 text-xs">{saving ? "Saving profile..." : "Save profile changes"}</button>
            <button type="button" onClick={() => void onLogout()} className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-danger/20 bg-danger/7 px-4 text-xs font-extrabold text-danger sm:w-auto"><LogOut className="size-4" /> Sign out</button>
          </div>
        </form>
      </div>
    </>
  );
}
