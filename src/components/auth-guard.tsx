'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { appReady, isAuthenticated } = useWorkspace();

  useEffect(() => {
    if (appReady && !isAuthenticated) router.replace("/login");
  }, [appReady, isAuthenticated, router]);

  if (!appReady || !isAuthenticated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" /> Opening StockFlow</div>
      </div>
    );
  }

  return <>{children}</>;
}
