'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { emptyWorkspace, type AppSettings, type AppUser, type AppWorkspaceState, type Product, type SaleItemInput } from "@/lib/app-types";

type Result = { ok: boolean; message: string };
type WorkspaceContextValue = {
  appReady: boolean;
  loadingData: boolean;
  isAuthenticated: boolean;
  currentUser: AppUser | null;
  workspace: AppWorkspaceState;
  databaseMessage: string;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  createWorkspace: (data: { fullName: string; companyName: string; email: string; password: string }) => Promise<Result>;
  updateSettings: (updates: AppSettings) => Promise<Result>;
  createEmployee: (employee: { fullName: string; email: string; password: string; role: "OWNER" | "EMPLOYEE"; title: string }) => Promise<Result>;
  recordSale: (payload: { customerName: string; paymentMethod: string; items: SaleItemInput[] }) => Promise<Result>;
  addProduct: (product: Omit<Product, "id">) => Promise<Result>;
  refreshWorkspace: () => Promise<void>;
  emailReport: () => Promise<Result>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

async function readMessage(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  return payload.message ?? (response.ok ? "Saved." : "Request failed.");
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<AppWorkspaceState>(emptyWorkspace);
  const [appReady, setAppReady] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [databaseMessage, setDatabaseMessage] = useState("");

  const fetchWorkspace = useCallback(async (activeSession: Session) => {
    setLoadingData(true);
    const response = await fetch("/api/workspace", { headers: { Authorization: `Bearer ${activeSession.access_token}` } });
    if (response.ok) {
      setWorkspace((await response.json()) as AppWorkspaceState);
      setDatabaseMessage("");
    } else {
      setWorkspace(emptyWorkspace);
      setDatabaseMessage(await readMessage(response));
    }
    setLoadingData(false);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (session) await fetchWorkspace(session);
  }, [fetchWorkspace, session]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) void fetchWorkspace(data.session);
      setAppReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setWorkspace(emptyWorkspace);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchWorkspace]);

  useEffect(() => {
    document.title = workspace.settings.appName || "StockFlow";
  }, [workspace.settings.appName]);

  const login = useCallback(async (email: string, password: string): Promise<Result> => {
    const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.session) return { ok: false, message: error?.message ?? "Sign in failed." };
    setSession(data.session);
    await fetchWorkspace(data.session);
    return { ok: true, message: "Welcome back." };
  }, [fetchWorkspace]);

  const logout = useCallback(async () => {
    await getSupabaseBrowserClient().auth.signOut();
    setSession(null);
    setWorkspace(emptyWorkspace);
  }, []);

  const createWorkspace = useCallback(async (data: { fullName: string; companyName: string; email: string; password: string }) => {
    const response = await fetch("/api/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return { ok: response.ok, message: await readMessage(response) };
  }, []);

  const mutate = useCallback(async (path: string, method: string, body: unknown): Promise<Result> => {
    if (!session) return { ok: false, message: "Your session has expired. Sign in again." };
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const message = await readMessage(response);
    if (response.ok) await fetchWorkspace(session);
    return { ok: response.ok, message };
  }, [fetchWorkspace, session]);

  const updateSettings = useCallback((updates: AppSettings) => mutate("/api/settings", "PATCH", updates), [mutate]);
  const createEmployee = useCallback((employee: { fullName: string; email: string; password: string; role: "OWNER" | "EMPLOYEE"; title: string }) => mutate("/api/employees", "POST", employee), [mutate]);
  const recordSale = useCallback((payload: { customerName: string; paymentMethod: string; items: SaleItemInput[] }) => mutate("/api/sales", "POST", payload), [mutate]);
  const addProduct = useCallback((product: Omit<Product, "id">) => mutate("/api/products", "POST", product), [mutate]);
  const emailReport = useCallback(() => mutate("/api/reports/email", "POST", {}), [mutate]);
  const currentUser = workspace.users.find((user) => user.id === session?.user.id) ?? null;

  return (
    <WorkspaceContext.Provider value={{ appReady, loadingData, isAuthenticated: Boolean(session), currentUser, workspace, databaseMessage, login, logout, createWorkspace, updateSettings, createEmployee, recordSale, addProduct, refreshWorkspace, emailReport }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  return context;
}
