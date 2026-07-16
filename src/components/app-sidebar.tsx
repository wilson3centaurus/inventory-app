'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, ChevronRight, LayoutDashboard, LogOut, Settings, ShoppingBasket, Sparkles, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import type { UserRole } from "@/lib/app-types";

export const navItems: Array<{ href: string; label: string; shortLabel: string; icon: LucideIcon; roles: UserRole[] }> = [
  { href: "/dashboard", label: "Daily pulse", shortLabel: "Home", icon: LayoutDashboard, roles: ["OWNER", "EMPLOYEE"] },
  { href: "/inventory", label: "Inventory", shortLabel: "Stock", icon: Boxes, roles: ["OWNER", "EMPLOYEE"] },
  { href: "/sales", label: "New sale", shortLabel: "Sell", icon: ShoppingBasket, roles: ["OWNER", "EMPLOYEE"] },
  { href: "/reports", label: "Insights", shortLabel: "Reports", icon: BarChart3, roles: ["OWNER", "EMPLOYEE"] },
  { href: "/employees", label: "Team", shortLabel: "Team", icon: UsersRound, roles: ["OWNER"] },
  { href: "/settings", label: "Workspace", shortLabel: "Settings", icon: Settings, roles: ["OWNER"] },
  { href: "/profile", label: "My profile", shortLabel: "Me", icon: UserRound, roles: ["OWNER", "EMPLOYEE"] },
];

function BrandMark() {
  return <span className="grid size-9 place-items-center rounded-[13px] bg-accent text-primary-deep"><Sparkles className="size-[18px]" strokeWidth={2.4} /></span>;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { currentUser, workspace, logout } = useWorkspace();
  const allowed = navItems.filter((item) => currentUser && item.roles.includes(currentUser.role));

  return (
    <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] flex-col rounded-[24px] bg-primary p-3 text-white shadow-[0_20px_60px_rgba(14,45,38,.16)] lg:flex">
      <div className="flex items-center gap-3 px-2 py-2">
        <BrandMark />
        <div className="min-w-0"><p className="truncate text-[15px] font-extrabold">{workspace.settings.appName}</p><p className="truncate text-[10px] text-white/55">{workspace.settings.companyName || "Inventory workspace"}</p></div>
      </div>
      <nav className="mt-7 flex flex-1 flex-col gap-1">
        {allowed.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition ${active ? "sidebar-active" : "text-white/68 hover:bg-white/8 hover:text-white"}`}><Icon className="size-[17px]" /><span className="flex-1">{label}</span>{active ? <ChevronRight className="size-3.5" /> : null}</Link>;
        })}
      </nav>
      <div className="rounded-[18px] bg-white/8 p-3">
        <p className="truncate text-xs font-bold">{currentUser?.fullName ?? "StockFlow user"}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/50">{currentUser?.role ?? "Loading"}</p>
        <button type="button" onClick={() => void logout()} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white/8 px-2.5 py-2 text-[11px] font-semibold text-white/75 hover:bg-white/12"><LogOut className="size-3.5" /> Sign out</button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { currentUser } = useWorkspace();
  const items = navItems.filter((item) => currentUser && item.roles.includes(currentUser.role) && ["/dashboard", "/inventory", "/sales", "/reports", "/profile"].includes(item.href));
  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-[22px] border border-white/10 bg-primary/95 p-1.5 text-white shadow-[0_16px_45px_rgba(14,45,38,.3)] backdrop-blur-xl lg:hidden" style={{ paddingBottom: "max(.45rem, env(safe-area-inset-bottom))" }}>
      {items.map(({ href, shortLabel, icon: Icon }) => {
        const active = pathname === href;
        return <Link key={href} href={href} className={`relative flex min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-[18px] px-1 text-[10px] font-extrabold transition ${active ? "shadow-sm" : ""}`} style={{ background: active ? "var(--nav-active-bg)" : "transparent", color: active ? "var(--nav-active-text)" : "var(--nav-inactive)" }}><Icon className="size-[17px]" strokeWidth={active ? 2.5 : 2.15} /><span>{shortLabel}</span>{href === "/sales" ? <span className={`absolute -top-2 grid size-5 place-items-center rounded-full text-[15px] leading-none ${active ? "bg-primary text-white" : "bg-accent text-accent-ink"}`}>+</span> : null}</Link>;
      })}
    </nav>
  );
}
