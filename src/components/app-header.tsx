'use client';

import Link from "next/link";
import { Cloud, CloudOff, RefreshCw, Settings } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  const { currentUser, workspace, loadingData, databaseMessage, refreshWorkspace } = useWorkspace();
  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-3 pt-1 lg:mb-6">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 lg:hidden"><span className="size-1.5 rounded-full bg-accent outline outline-2 outline-primary" /><p className="truncate text-[10px] font-extrabold uppercase tracking-[.16em] text-muted">{workspace.settings.appName}</p></div>
          <h1 className="truncate text-[22px] font-extrabold tracking-[-.035em] lg:text-[28px]">{title}</h1>
          <p className="mt-0.5 truncate text-[11px] text-muted lg:text-xs">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <ThemeToggle />
          <button aria-label="Refresh data" type="button" onClick={() => void refreshWorkspace()} className="grid size-10 place-items-center rounded-[14px] border border-border bg-surface text-muted shadow-sm active:bg-surface-strong"><RefreshCw className={`size-4 ${loadingData ? "animate-spin" : ""}`} /></button>
          <Link aria-label="Settings" href={currentUser?.role === "OWNER" ? "/settings" : "/profile"} className="grid size-10 place-items-center rounded-[14px] bg-primary text-white"><Settings className="size-4" /></Link>
        </div>
      </header>
      {databaseMessage ? <div className="mb-4 flex items-start gap-2 rounded-2xl border border-danger/20 bg-danger/8 px-3 py-2.5 text-xs text-danger"><CloudOff className="mt-0.5 size-4 shrink-0" /><span>{databaseMessage} Apply the StockFlow database migrations, then refresh.</span></div> : null}
      {!databaseMessage && loadingData ? <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-[11px] text-muted"><Cloud className="size-3.5" /> Syncing live workspace...</div> : null}
    </>
  );
}
