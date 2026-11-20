import { NextResponse } from "next/server";
import { query } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Keep-warm ping for a free uptime monitor (UptimeRobot, cron-job.org). Point it here every 4 minutes.
 *
 * A small hosted database sleeps after a few minutes without use and takes several seconds to wake, which the first visitor feels.
 * This touches the database only during the hours people actually shop (Indian time), so it is awake when needed but sleeps
 * overnight, because a database that never sleeps would use up the free plan's monthly compute hours.
 * Change the window with WARM_FROM_HOUR / WARM_TO_HOUR (0-23, Indian time, end exclusive).
 */
function inWarmWindow(now = new Date()) {
  const from = Number(process.env.WARM_FROM_HOUR ?? 10);
  const to = Number(process.env.WARM_TO_HOUR ?? 20);
  const hour = new Date(now.getTime() + 5.5 * 3600_000).getUTCHours(); // India has no daylight saving
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
}

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!inWarmWindow()) return NextResponse.json({ ok: true, warmed: false }, { headers });
  try {
    await query(`select 1`);
    return NextResponse.json({ ok: true, warmed: true }, { headers });
  } catch (err) {
    console.error(JSON.stringify({ level: "error", event: "medneed_warm", message: (err as Error)?.message?.slice(0, 300) }));
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
}
