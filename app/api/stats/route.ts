import { query } from "@/lib/db";
import { handle, json } from "@/lib/http";

// Public landing-page counter. Cached briefly so a crowd refreshing can't load the DB.
let cache: { at: number; interviewsToday: number } | null = null;

export async function GET() {
  return handle("stats", async () => {
    if (!cache || Date.now() - cache.at > 15_000) {
      const [row] = await query<{ n: number }>(
        `select count(distinct s.id)::int as n
           from sessions s
           join users u on u.id = s.user_id
           join answers a on a.session_id = s.id
          where not u.is_internal and not u.is_event_staff
            and a.created_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')`,
      );
      cache = { at: Date.now(), interviewsToday: row.n };
    }
    return json({ interviewsToday: cache.interviewsToday });
  });
}
