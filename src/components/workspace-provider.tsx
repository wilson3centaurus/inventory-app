'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { emptyWorkspace, type AppSettings, type AppUser, type AppWorkspaceState, type Product, type SaleItemInput } from "@/lib/app-types";

type Result = { ok: boolean; message: string };
export type ProductUpdate = { id: string; name?: string; barcode?: string; costPrice?: number; sellingPrice?: number; minStock?: number; expiryDate?: string | null; stockChange?: number; reason?: "RESTOCK" | "DAMAGE" | "COUNT" };
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
  updateProfile: (updates: {
    fullName: string;
    email: string;
    title: string;
    companyName?: string;
    shopName?: string;
    shopLocation?: string;
  }) => Promise<Result>;
  updateSettings: (updates: AppSettings) => Promise<Result>;
  createEmployee: (employee: { fullName: string; email: string; password: string; role: "OWNER" | "EMPLOYEE"; title: string }) => Promise<Result>;
  changePassword: (passwords: { currentPassword: string; newPassword: string }) => Promise<Result>;
  resetEmployeePassword: (userId: string, password: string) => Promise<Result>;
  recordSale: (payload: { customerName: string; paymentMethod: string; items: SaleItemInput[] }) => Promise<Result>;
  addProduct: (product: Omit<Product, "id">) => Promise<Result>;
  updateProduct: (update: ProductUpdate) => Promise<Result>;
  startEcoCash: (payload: { phone: string; customerName: string; items: SaleItemInput[] }) => Promise<Result & { ticket?: string }>;
  checkEcoCash: (ticket: string) => Promise<Result & { state: "pending" | "paid" | "failed" | "paid_unrecorded" | "error" }>;
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

  const updateProfile = useCallback((updates: {
    fullName: string;
    email: string;
    title: string;
    companyName?: string;
    shopName?: string;
    shopLocation?: string;
  }) => mutate("/api/profile", "PATCH", updates), [mutate]);

  const updateSettings = useCallback((updates: AppSettings) => mutate("/api/settings", "PATCH", updates), [mutate]);
  const createEmployee = useCallback((employee: { fullName: string; email: string; password: string; role: "OWNER" | "EMPLOYEE"; title: string }) => mutate("/api/employees", "POST", employee), [mutate]);
  const changePassword = useCallback(async (passwords: { currentPassword: string; newPassword: string }) => {
    if (!session) return { ok: false, message: "Your session has expired. Sign in again." };
    const response = await fetch("/api/profile/password", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(passwords) });
    const message = await readMessage(response);
    if (!response.ok) return { ok: false, message };
    // Refresh the session with the new password so this device stays signed in.
    const email = session.user.email;
    if (email) {
      const { data } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password: passwords.newPassword });
      if (data.session) setSession(data.session);
    }
    return { ok: true, message };
  }, [session]);
  const resetEmployeePassword = useCallback((userId: string, password: string) => mutate("/api/employees", "PATCH", { userId, password }), [mutate]);
  const recordSale = useCallback((payload: { customerName: string; paymentMethod: string; items: SaleItemInput[] }) => mutate("/api/sales", "POST", payload), [mutate]);
  const addProduct = useCallback((product: Omit<Product, "id">) => mutate("/api/products", "POST", product), [mutate]);
  const updateProduct = useCallback((update: ProductUpdate) => mutate("/api/products", "PATCH", update), [mutate]);
  const startEcoCash = useCallback(async (payload: { phone: string; customerName: string; items: SaleItemInput[] }) => {
    if (!session) return { ok: false, message: "Your session has expired. Sign in again." };
    const response = await fetch("/api/payments/ecocash", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(payload) });
    const data = (await response.json().catch(() => ({}))) as { message?: string; ticket?: string };
    return { ok: response.ok && Boolean(data.ticket), message: data.message ?? "EcoCash request failed.", ticket: data.ticket };
  }, [session]);
  const checkEcoCash = useCallback(async (ticket: string) => {
    if (!session) return { ok: false, state: "error" as const, message: "Your session has expired. Sign in again." };
    const response = await fetch("/api/payments/ecocash/status", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ticket }) });
    const data = (await response.json().catch(() => ({}))) as { message?: string; state?: "pending" | "paid" | "failed" | "paid_unrecorded" };
    const state: "pending" | "paid" | "failed" | "paid_unrecorded" | "error" = data.state ?? "error";
    if (state === "paid") await fetchWorkspace(session);
    return { ok: state === "paid", state, message: data.message ?? "Could not check the EcoCash payment." };
  }, [fetchWorkspace, session]);
  const emailReport = useCallback(() => mutate("/api/reports/email", "POST", {}), [mutate]);
  const currentUser = workspace.users.find((user) => user.id === session?.user.id) ?? null;

  return (
    <WorkspaceContext.Provider value={{ appReady, loadingData, isAuthenticated: Boolean(session), currentUser, workspace, databaseMessage, login, logout, createWorkspace, updateProfile, updateSettings, createEmployee, changePassword, resetEmployeePassword, recordSale, addProduct, updateProduct, startEcoCash, checkEcoCash, refreshWorkspace, emailReport }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  return context;
}
