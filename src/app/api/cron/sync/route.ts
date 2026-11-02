import { getCurrentSeason } from "@/lib/data";
import { syncSeason } from "@/lib/sync";

/**
 * Backup to the on-visit sync, for a scheduler (e.g. a GitHub Action every 10 minutes) to call during the
 * tournament so results stay fresh even when nobody has the site open.
 * Requires `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const season = await getCurrentSeason();
  if (!season?.startDay) return Response.json({ synced: false, reason: "no ESPN-linked season is active" });
  try {
    await syncSeason(season.year);
    return Response.json({ synced: true, year: season.year });
  } catch (err) {
    return Response.json({ synced: false, error: String(err) }, { status: 502 });
  }
}
