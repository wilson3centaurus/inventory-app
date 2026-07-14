import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "SokoFlow",
    status: "ok",
    database: "self-hosted supabase",
    schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA ?? "sokoflow_inventory",
    mode: "pwa",
  });
}
