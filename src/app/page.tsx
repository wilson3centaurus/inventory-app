'use client';

import { useEffect, useMemo, useState } from "react";

type Language = "en" | "sn";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const copy = {
  en: {
    badge: "Offline-first PWA for Zimbabwean SMEs",
    headline: "SokoFlow keeps your stock moving, even when the network does not.",
    subline:
      "A mobile-first inventory workspace for owners and employees with local-first transactions, sales recording, expiry alerts, and smart restocking guidance.",
    install: "Install app",
    dashboard: "Business dashboard",
    voiceTitle: "Voice stock entry",
    voiceHint: 'Try: "Add twenty bottles of Coca-Cola."',
    loginTitle: "Role-aware access",
    owner: "Owner",
    employee: "Employee",
    quickStats: "Today at a glance",
  },
  sn: {
    badge: "PWA inoshanda kunyangwe pasina internet",
    headline: "SokoFlow inochengeta stock yako ichifamba kunyange network isipo.",
    subline:
      "Inventory app yakagadzirirwa mafoni, ine owner neemployee access, local storage, sales recording, expiry alerts, uye restocking guidance.",
    install: "Isa app",
    dashboard: "Dhibhodhi rebhizimisi",
    voiceTitle: "Kupinza stock nezwi",
    voiceHint: 'Edza: "Isa mabhodhoro makumi maviri eCoca-Cola."',
    loginTitle: "Kupinda kwakachengeteka",
    owner: "Muridzi",
    employee: "Mushandi",
    quickStats: "Nhasi pakarepo",
  },
} as const;

const statCards = [
  { label: "Today's Sales", value: "$1,280", change: "+12%", accent: "text-primary" },
  { label: "Current Profit", value: "$420", change: "+8%", accent: "text-accent" },
  { label: "Low Stock Items", value: "7", change: "2 urgent", accent: "text-rose-600" },
  { label: "Inventory Value", value: "$12,940", change: "Across 2 shops", accent: "text-primary-deep" },
];

const stockAlerts = [
  { name: "Coca-Cola 500ml", remaining: "5 bottles", status: "Low Stock" },
  { name: "Cooking Oil 2L", remaining: "4 units", status: "Restock before Friday" },
  { name: "Panado Tabs", remaining: "12 packs", status: "Expires in 9 days" },
];

const movements = [
  { type: "Incoming stock", item: "20 x Mazoe Orange Crush", when: "08:10", by: "Rumbi" },
  { type: "Sale recorded", item: "3 x Bread loaves", when: "10:32", by: "Brian" },
  { type: "Damage logged", item: "2 x Tomato sauce bottles", when: "12:05", by: "Tino" },
  { type: "Credit sale", item: "Customer: Tariro", when: "14:20", by: "Owner" },
];

const features = [
  "Secure owner and employee login",
  "Product, supplier, pricing, and barcode tracking",
  "Offline mode with sync queue",
  "Low-stock and expiry alerts",
  "Voice stock entry in English or Shona",
  "AI restocking suggestions",
  "WhatsApp-ready reports",
  "Multi-shop dashboard",
];

const reportCards = [
  "Daily Sales",
  "Weekly Sales",
  "Monthly Sales",
  "Profit Report",
  "Fast Moving Products",
  "Customer Credit Tracker",
];

const LOCAL_QUEUE_KEY = "sokoflow-voice-queue";
const LOCAL_LANG_KEY = "sokoflow-language";

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [isOnline, setIsOnline] = useState(true);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [queuedVoiceEntries, setQueuedVoiceEntries] = useState<string[]>([]);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const text = copy[language];

  useEffect(() => {
    const win = window as Window & {
      webkitSpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      };
      SpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      };
    };

    const frame = window.requestAnimationFrame(() => {
      const savedLanguage = window.localStorage.getItem(LOCAL_LANG_KEY) as Language | null;
      const savedQueue = window.localStorage.getItem(LOCAL_QUEUE_KEY);

      if (savedLanguage === "en" || savedLanguage === "sn") {
        setLanguage(savedLanguage);
      }

      if (savedQueue) {
        try {
          setQueuedVoiceEntries(JSON.parse(savedQueue) as string[]);
        } catch {
          window.localStorage.removeItem(LOCAL_QUEUE_KEY);
        }
      }

      setIsOnline(window.navigator.onLine);
      setVoiceSupported(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition));
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstall);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_LANG_KEY, language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queuedVoiceEntries));
  }, [queuedVoiceEntries]);

  const syncStatus = useMemo(() => {
    if (!isOnline && queuedVoiceEntries.length > 0) {
      return `${queuedVoiceEntries.length} item(s) waiting to sync`;
    }

    if (!isOnline) {
      return "Offline mode active";
    }

    if (queuedVoiceEntries.length > 0) {
      return `${queuedVoiceEntries.length} draft command(s) ready for upload`;
    }

    return "All local data is synced";
  }, [isOnline, queuedVoiceEntries.length]);

  const startVoiceCapture = async () => {
    const win = window as Window & {
      webkitSpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      };
      SpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      };
    };

    const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceMessage("Voice entry is not supported in this browser yet.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = language === "sn" ? "sn-ZW" : "en-ZW";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setVoiceMessage(transcript);
      setQueuedVoiceEntries((current) => [transcript, ...current].slice(0, 4));
    };
    recognition.start();
  };

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      <section className="glass-panel relative overflow-hidden rounded-[2rem] px-4 py-5 sm:px-6">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(201,109,27,0.22),transparent_60%)]" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary-deep">
                SokoFlow
              </p>
              <p className="mt-1 text-xs text-muted">{text.badge}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  language === "en"
                    ? "bg-primary text-white"
                    : "bg-white/70 text-muted ring-1 ring-border"
                }`}
                onClick={() => setLanguage("en")}
                type="button"
              >
                English
              </button>
              <button
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  language === "sn"
                    ? "bg-accent text-white"
                    : "bg-white/70 text-muted ring-1 ring-border"
                }`}
                onClick={() => setLanguage("sn")}
                type="button"
              >
                Shona
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-primary-deep ring-1 ring-border">
                  Mobile First PWA
                </span>
                <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                  {text.headline}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
                  {text.subline}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(201,109,27,0.28)] transition hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!promptEvent}
                  onClick={handleInstall}
                  type="button"
                >
                  {promptEvent ? text.install : "Already installable in supported browsers"}
                </button>
                <a
                  className="rounded-full border border-border bg-white/60 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/90"
                  href="#dashboard"
                >
                  {text.dashboard}
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="metric-card rounded-[1.4rem] p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Sync</p>
                  <p className="mt-2 text-sm font-semibold">{syncStatus}</p>
                </div>
                <div className="metric-card rounded-[1.4rem] p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Multi-shop</p>
                  <p className="mt-2 text-sm font-semibold">Shop A and Shop B on one phone</p>
                </div>
                <div className="metric-card rounded-[1.4rem] p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Power Cuts</p>
                  <p className="mt-2 text-sm font-semibold">Each action saves instantly for recovery</p>
                </div>
              </div>
            </div>

            <aside className="glass-panel rounded-[1.8rem] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted">
                    {text.loginTitle}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">Owner / Employee</h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-[1.4rem] border border-border bg-white/70 p-4">
                  <p className="text-sm font-semibold">{text.owner}</p>
                  <p className="mt-2 text-xs leading-6 text-muted">
                    Dashboard, profit, stock control, reports, AI restock suggestions, backups.
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-border bg-white/70 p-4">
                  <p className="text-sm font-semibold">{text.employee}</p>
                  <p className="mt-2 text-xs leading-6 text-muted">
                    Sales entry, incoming stock, barcode scan, damage logs, customer credit updates.
                  </p>
                </div>
                <div className="rounded-[1.4rem] bg-[#1f1b16] p-4 text-white">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">
                    Self-hosted database
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/90">
                    Supabase is configured to use a dedicated schema for this product instead of the shared
                    `public` schema.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="dashboard" className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted">{text.quickStats}</p>
              <h2 className="mt-2 text-xl font-semibold">Owner dashboard</h2>
            </div>
            <p className="text-xs text-muted">Harare CBD • 2 active shops</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <article key={card.label} className="metric-card rounded-[1.5rem] p-4">
                <p className="text-xs text-muted">{card.label}</p>
                <p className={`mt-3 text-2xl font-semibold ${card.accent}`}>{card.value}</p>
                <p className="mt-1 text-xs font-medium text-muted">{card.change}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.6rem] border border-border bg-white/72 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Low stock and expiry watch</h3>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  Alerts
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {stockAlerts.map((alert) => (
                  <div key={alert.name} className="rounded-2xl bg-[#fff8ef] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{alert.name}</p>
                      <span className="text-[11px] font-semibold text-primary-deep">{alert.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">Remaining: {alert.remaining}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-border bg-white/72 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">AI restocking suggestions</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Smart
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#eefaf4] p-3">
                  <p className="text-sm font-semibold">Cooking Oil</p>
                  <p className="mt-1 text-xs leading-6 text-muted">
                    Recommendation: restock before Friday. Sales spike every payday weekend.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#fff8ef] p-3">
                  <p className="text-sm font-semibold">Bread and soft drinks</p>
                  <p className="mt-1 text-xs leading-6 text-muted">
                    Cross-shop demand rose 18% this week. Move stock from Shop B to Shop A before 17:00.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#fff4f0] p-3">
                  <p className="text-sm font-semibold">Theft detection</p>
                  <p className="mt-1 text-xs leading-6 text-muted">
                    Warning: 10 bottles missing without a recorded sale. Review yesterday&apos;s closeout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <section className="glass-panel rounded-[2rem] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted">{text.voiceTitle}</p>
                <h2 className="mt-2 text-lg font-semibold">Fast capture for busy shop floors</h2>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-muted ring-1 ring-border">
                {voiceSupported ? "Browser supported" : "Manual fallback"}
              </span>
            </div>

            <div className="mt-4 rounded-[1.6rem] border border-border bg-white/75 p-4">
              <p className="text-xs leading-6 text-muted">{text.voiceHint}</p>
              <button
                className="mt-4 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                onClick={startVoiceCapture}
                type="button"
              >
                Start voice entry
              </button>
              <p className="mt-4 text-sm font-medium">
                {voiceMessage || "New voice commands will appear here and save locally for sync."}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {queuedVoiceEntries.length > 0 ? (
                queuedVoiceEntries.map((entry, index) => (
                  <div
                    key={`${entry}-${index}`}
                    className="rounded-[1.4rem] border border-dashed border-border bg-[#fff9f0] px-3 py-3 text-sm"
                  >
                    {entry}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-border bg-white/60 px-3 py-4 text-sm text-muted">
                  Offline queue is empty.
                </div>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-[2rem] p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Stock timeline</p>
            <div className="mt-4 space-y-3">
              {movements.map((movement) => (
                <div key={`${movement.type}-${movement.when}`} className="rounded-[1.5rem] bg-white/72 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{movement.type}</p>
                    <span className="font-mono text-xs text-muted">{movement.when}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">{movement.item}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-primary-deep">
                    {movement.by}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel rounded-[2rem] p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Feature map</p>
          <h2 className="mt-2 text-xl font-semibold">Built for local retail realities</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="rounded-[1.4rem] border border-border bg-white/70 px-4 py-4 text-sm">
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Reports</p>
              <h2 className="mt-2 text-xl font-semibold">Share, export, and decide quickly</h2>
            </div>
            <span className="rounded-full bg-[#1f1b16] px-3 py-1 text-[11px] font-semibold text-white">
              WhatsApp friendly
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {reportCards.map((report) => (
              <div key={report} className="rounded-[1.4rem] bg-gradient-to-br from-white to-[#fff2df] p-4">
                <p className="text-sm font-semibold">{report}</p>
                <p className="mt-2 text-xs leading-6 text-muted">
                  Exportable as a mobile-ready summary for the owner, accountant, or WhatsApp sharing.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
