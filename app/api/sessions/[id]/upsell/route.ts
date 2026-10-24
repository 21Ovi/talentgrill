import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, json, isUuid, notFound } from "@/lib/http";
import { loadSession } from "@/lib/session";

// Funnel signal: the user tapped "Unlock" on the Pro upsell.
export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/upsell">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "upsell",
    async () => {
      const s = await loadSession(id);
      if (!s) throw new HttpError(404, "Session not found.");
      await logEvent({ actor: "user", type: "upsell_clicked", userId: s.userId, sessionId: id, payload: requestMeta(req) });
      return json({ ok: true });
    },
    { sessionId: id },
  );
}
