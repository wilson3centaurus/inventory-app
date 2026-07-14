'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/workspace-provider";

export default function Home() {
  const router = useRouter();
  const { appReady, isAuthenticated } = useWorkspace();

  useEffect(() => {
    if (!appReady) return;
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [appReady, isAuthenticated, router]);

  return null;
}
