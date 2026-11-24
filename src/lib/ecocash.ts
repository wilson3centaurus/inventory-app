import crypto from "crypto";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Paynow } = require("paynow") as { Paynow: new (id: string, key: string, resultUrl?: string, returnUrl?: string) => PaynowClient };

type PaynowPayment = { add: (title: string, amount: number) => PaynowPayment };
type PaynowClient = {
  resultUrl: string;
  returnUrl: string;
  createPayment: (reference: string, authEmail: string) => PaynowPayment;
  sendMobile: (payment: PaynowPayment, phone: string, method: string) => Promise<{ success: boolean; error?: string; pollUrl?: string; instructions?: string }>;
  parseStatusUpdate: (body: string) => { status?: string; amount?: string; paynowReference?: string; reference?: string };
};

export type EcoCashTicket = {
  reference: string;
  pollUrl: string;
  organizationId: string;
  shopId: string | null;
  userId: string;
  customerName: string;
  phone: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
  expiresAt: number;
};

const PAID_STATUSES = new Set(["paid", "awaiting delivery", "delivered"]);
const FAILED_STATUSES = new Set(["cancelled", "failed", "disputed", "refunded"]);

export function ecocashConfigured() {
  return Boolean(process.env.PAYNOW_INTEGRATION_ID && process.env.PAYNOW_INTEGRATION_KEY);
}

function client(origin: string) {
  const paynow = new Paynow(process.env.PAYNOW_INTEGRATION_ID!, process.env.PAYNOW_INTEGRATION_KEY!);
  paynow.resultUrl = `${origin}/api/payments/ecocash/result`;
  paynow.returnUrl = `${origin}/sales`;
  return paynow;
}

/** Accepts 077…, 078…, +263 77…, 263 78… and returns Paynow's 07XXXXXXXX format. */
export function normaliseEcoCashPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("263") ? `0${digits.slice(3)}` : digits.startsWith("7") ? `0${digits}` : digits;
  return /^07[78]\d{7}$/.test(local) ? local : null;
}

export async function startEcoCashPayment(options: { origin: string; reference: string; authEmail: string; phone: string; description: string; amount: number }) {
  const paynow = client(options.origin);
  const payment = paynow.createPayment(options.reference, options.authEmail);
  payment.add(options.description, Math.round(options.amount * 100) / 100);
  return paynow.sendMobile(payment, options.phone, "ecocash");
}

export async function checkEcoCashPayment(origin: string, pollUrl: string) {
  const response = await fetch(pollUrl, { method: "POST", cache: "no-store" });
  const text = await response.text();
  const status = client(origin).parseStatusUpdate(text); // throws if the hash does not match
  const state = String(status.status ?? "").toLowerCase();
  return {
    state: PAID_STATUSES.has(state) ? "paid" as const : FAILED_STATUSES.has(state) ? "failed" as const : "pending" as const,
    rawStatus: status.status ?? "Unknown",
    amount: Number(status.amount ?? 0),
    paynowReference: status.paynowReference ?? "",
  };
}

export function isPaynowPollUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)paynow\.co\.zw$/i.test(url.hostname);
  } catch {
    return false;
  }
}

// The pending payment is carried by the browser as a signed ticket, so no extra table is needed.
function secret() {
  return `${process.env.PAYNOW_INTEGRATION_KEY ?? ""}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`;
}

export function signTicket(ticket: EcoCashTicket) {
  const body = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readTicket(token: string): EcoCashTicket | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as EcoCashTicket;
  } catch {
    return null;
  }
}

export const ecocashPaymentMethod = (reference: string) => `ecocash ${reference}`;
