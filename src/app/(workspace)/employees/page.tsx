'use client';

import { useState } from "react";
import { KeyRound, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useWorkspace } from "@/components/workspace-provider";

export default function EmployeesPage() {
  const { currentUser, createEmployee, workspace } = useWorkspace();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "EMPLOYEE" as "OWNER" | "EMPLOYEE", title: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  if (currentUser?.role !== "OWNER") return <><AppHeader title="Team" description="Owner access is required." /><div className="app-card rounded-[22px] p-6 text-xs text-muted">You do not have permission to manage employee accounts.</div></>;
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); const result = await createEmployee(form); setSaving(false); setMessage(result.message); if (result.ok) setForm({ fullName: "", email: "", password: "", role: "EMPLOYEE", title: "" }); };
  return (
    <>
      <AppHeader title="Team" description={`${workspace.users.length} people can access this workspace.`} />
      {message ? <div className="mb-3 rounded-[14px] bg-primary/7 px-3 py-2.5 text-[11px] text-primary">{message}</div> : null}
      <div className="grid gap-3 xl:grid-cols-[.8fr_1.2fr]">
        <form onSubmit={submit} className="app-card rounded-[22px] p-4"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-[14px] bg-accent text-primary"><UserPlus className="size-4" /></span><div><p className="eyebrow">New login</p><h2 className="mt-1 text-sm font-extrabold">Add team member</h2></div></div><div className="mt-4 space-y-3">{[["fullName", "Full name", "Rudo Moyo", "text"], ["email", "Email address", "rudo@business.co.zw", "email"], ["password", "Temporary password", "Minimum 8 characters", "password"], ["title", "Job title", "Sales assistant", "text"]].map(([key, label, placeholder, type]) => <label key={key} className="block space-y-1.5"><span className="text-[10px] font-bold text-muted">{label}</span><input required={key !== "title"} type={type} minLength={key === "password" ? 8 : undefined} className="field w-full rounded-[14px] px-3 text-xs" placeholder={placeholder} value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label className="block space-y-1.5"><span className="text-[10px] font-bold text-muted">Access level</span><select className="field w-full rounded-[14px] px-3 text-xs" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as "OWNER" | "EMPLOYEE" }))}><option value="EMPLOYEE">Employee · Sales and inventory</option><option value="OWNER">Owner · Full workspace access</option></select></label></div><button disabled={saving} className="primary-button mt-4 w-full px-4 text-xs">{saving ? "Creating secure login..." : "Create employee account"}</button><p className="mt-3 flex gap-1.5 text-[9px] leading-4 text-muted"><KeyRound className="mt-0.5 size-3 shrink-0" /> The temporary password is stored securely by Supabase Auth, never in StockFlow tables.</p></form>
        <section className="app-card rounded-[22px] p-4"><div className="flex items-center justify-between"><div><p className="eyebrow">Directory</p><h2 className="mt-1 text-sm font-extrabold">Workspace access</h2></div><UsersRound className="size-4 text-primary" /></div><div className="mt-3 divide-y divide-border">{workspace.users.map((user) => <article key={user.id} className="flex items-center gap-3 py-3"><span className="grid size-10 shrink-0 place-items-center rounded-[15px] bg-primary text-xs font-extrabold text-white">{user.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{user.fullName}</p><p className="mt-1 truncate text-[9px] text-muted">{user.email} · {user.title}</p></div><span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-extrabold ${user.role === "OWNER" ? "bg-accent text-accent-ink" : "bg-primary/7 text-primary"}`}><ShieldCheck className="size-2.5" /> {user.role}</span></article>)}{!workspace.users.length ? <div className="grid min-h-48 place-items-center text-[10px] text-muted">No team records were returned.</div> : null}</div></section>
      </div>
    </>
  );
}
