'use client';

import { AuthGuard } from "@/components/auth-guard";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <div className="mx-auto grid min-h-dvh max-w-[1500px] gap-5 px-3 pt-3 lg:grid-cols-[224px_minmax(0,1fr)] lg:px-4 lg:pt-4">
        <AppSidebar />
        <main className="safe-bottom min-w-0 page-enter lg:px-1 lg:pt-1">{children}</main>
        <MobileNav />
      </div>
    </AuthGuard>
  );
}
