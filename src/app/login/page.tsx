'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Boxes, Building2, CheckCircle2, CloudOff, Eye, EyeOff, LockKeyhole, ScanLine, Sparkles } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { DEFAULT_APP_NAME } from "@/lib/app-settings";

export default function LoginPage() {
  const router = useRouter();
  const { appReady, isAuthenticated, login, createWorkspace, workspace } = useWorkspace();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checking, setChecking] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [form, setForm] = useState({ fullName: "", companyName: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const appName = workspace.settings.appName || DEFAULT_APP_NAME;

  useEffect(() => {
    if (appReady && isAuthenticated) router.replace("/dashboard");
  }, [appReady, isAuthenticated, router]);

  useEffect(() => {
    fetch("/api/bootstrap").then(async (response) => {
      const payload = (await response.json().catch(() => ({}))) as { needsSetup?: boolean; message?: string };
      if (!response.ok) setSetupError(payload.message ?? "Database setup could not be checked.");
      const required = Boolean(payload.needsSetup);
      setNeedsSetup(required); setMode(required ? "setup" : "login");
    }).catch(() => setSetupError("The database is not reachable.")).finally(() => setChecking(false));
  }, []);

  const switchMode = (nextMode: "login" | "setup") => {
    if (nextMode === "setup" && !needsSetup) {
      setMode("login");
      setMessage("Your business workspace is already set up. Sign in with the owner or employee account.");
      return;
    }
    setMessage("");
    setMode(nextMode);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setMessage("");
    const result = mode === "setup" ? await createWorkspace(form) : await login(form.email, form.password);
    setLoading(false); setMessage(result.message);
    if (result.ok && mode === "setup") { setMode("login"); setNeedsSetup(false); setForm((current) => ({ ...current, password: "" })); }
    if (result.ok && mode === "login") router.replace("/dashboard");
  };

  return (
    <main className="grid min-h-dvh bg-primary lg:grid-cols-[1.05fr_.95fr]">
      <ThemeToggle className="fixed right-4 top-4 z-20 lg:right-6 lg:top-6" />
      <section className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-44 -top-44 size-[34rem] rounded-full border-[80px] border-accent/8" />
        <div className="relative flex items-center gap-3"><span className="grid size-10 place-items-center rounded-[15px] bg-accent text-primary"><Sparkles className="size-5" /></span><div><p className="text-base font-extrabold">{workspace.settings.appName || "StockFlow"}</p><p className="text-[9px] uppercase tracking-[.18em] text-white/45">The shop operating system</p></div></div>
        <div className="relative max-w-xl"><span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-[10px] font-bold text-accent"><span className="size-1.5 rounded-full bg-accent" /> Built for the rhythm of local retail</span><h1 className="mt-6 text-5xl font-extrabold leading-[1.04] tracking-[-.055em] xl:text-6xl">Know what&apos;s moving.<br />Before it&apos;s gone.</h1><p className="mt-5 max-w-lg text-sm leading-7 text-white/55">Sales, stock, expiry and your team in one resilient workspace designed to work from the phone already in your pocket.</p><div className="mt-8 grid grid-cols-3 gap-3">{[{ icon: ScanLine, label: "Camera scanning" }, { icon: CloudOff, label: "Offline-ready PWA" }, { icon: Boxes, label: "Live stock ledger" }].map(({ icon: Icon, label }) => <div key={label} className="rounded-[18px] bg-white/7 p-3"><Icon className="size-4 text-accent" /><p className="mt-3 text-[10px] font-bold text-white/70">{label}</p></div>)}</div></div>
        <p className="relative text-[9px] text-white/30">Securely backed by your self-hosted Supabase infrastructure.</p>
      </section>

      <section className="flex min-h-dvh items-center justify-center rounded-t-[32px] bg-background px-4 py-8 lg:rounded-l-[36px] lg:rounded-tr-none">
        <div className="w-full max-w-[390px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="grid size-14 place-items-center rounded-[20px] bg-accent text-primary shadow-[0_16px_40px_rgba(200,237,90,.24)]"><Sparkles className="size-6" /></span>
            <p className="mt-4 text-[22px] font-extrabold tracking-[-.04em]">{appName}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[.22em] text-muted">The shop operating system</p>
          </div>
          {!checking ? <div className="mb-5 grid grid-cols-2 gap-2 rounded-[18px] border border-border bg-surface-soft p-1.5">
            <button type="button" onClick={() => switchMode("login")} className={`rounded-[14px] px-3 py-2.5 text-[11px] font-extrabold transition ${mode === "login" ? "bg-primary text-white shadow-sm" : "text-muted"}`}>Sign in</button>
            <button type="button" onClick={() => switchMode("setup")} className={`rounded-[14px] px-3 py-2.5 text-[11px] font-extrabold transition ${mode === "setup" ? "bg-accent text-accent-ink shadow-sm" : "text-muted"}`}><span className="inline-flex items-center gap-1.5"><Building2 className="size-3.5" /> Create business</span></button>
          </div> : null}
          <p className="eyebrow">{mode === "setup" ? "First-time setup" : "Secure workspace"}</p><h1 className="mt-2 text-[30px] font-extrabold tracking-[-.045em]">{mode === "setup" ? "Open your shop." : "Welcome back."}</h1><p className="mt-2 text-xs leading-5 text-muted">{mode === "setup" ? "Create the owner account and your real database workspace." : "Sign in with your StockFlow account."}</p>
          {setupError ? <div className="mt-4 rounded-[16px] border border-danger/20 bg-danger/7 p-3 text-[10px] leading-5 text-danger"><CloudOff className="mr-1 inline size-3.5" /> {setupError} Apply migrations `001` and `002`, including the additive PostgREST schema registration.</div> : null}
          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "setup" ? <><label className="block space-y-1.5"><span className="text-[10px] font-bold text-muted">Your full name</span><input required className="field w-full rounded-[14px] px-3 text-xs" placeholder="Business owner" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></label><label className="block space-y-1.5"><span className="text-[10px] font-bold text-muted">Business name</span><input required className="field w-full rounded-[14px] px-3 text-xs" placeholder="Your shop name" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} /></label></> : null}
            <label className="block space-y-1.5"><span className="text-[10px] font-bold text-muted">Email address</span><input required type="email" autoComplete="email" className="field w-full rounded-[14px] px-3 text-xs" placeholder="you@business.co.zw" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
            <label className="block space-y-1.5"><span className="text-[10px] font-bold text-muted">Password</span><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input required minLength={8} type={showPassword ? "text" : "password"} autoComplete={mode === "setup" ? "new-password" : "current-password"} className="field w-full rounded-[14px] pl-9 pr-11 text-xs" placeholder="At least 8 characters" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:bg-surface-soft hover:text-foreground">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
            {message ? <div className="rounded-[14px] bg-primary/7 px-3 py-2.5 text-[10px] leading-5 text-primary">{message}</div> : null}
            <button disabled={loading || checking || Boolean(setupError)} className="primary-button flex w-full items-center justify-center gap-2 px-4 text-xs">{loading ? "Working securely..." : mode === "setup" ? "Create live workspace" : "Sign in"}<ArrowRight className="size-4" /></button>
          </form>
          {!needsSetup && !checking ? <p className="mt-5 flex items-center justify-center gap-1.5 text-[9px] text-muted"><CheckCircle2 className="size-3 text-primary" /> Passwords and sessions are handled by Supabase Auth.</p> : null}
        </div>
      </section>
    </main>
  );
}
