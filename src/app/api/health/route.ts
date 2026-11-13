import { NextResponse } from "next/server";
import { query } from "@/server/db";

export const dynamic = "force-dynamic";

/** Liveness + database check for the load balancer, Docker HEALTHCHECK and uptime monitors. Reveals nothing else. */
export async function GET() {
  try {
    await query(`select 1`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // The reason goes to the server log only (it can contain host names); the response stays generic.
    console.error(JSON.stringify({ level: "error", event: "medneed_health", message: (err as Error)?.message?.slice(0, 500) }));
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
