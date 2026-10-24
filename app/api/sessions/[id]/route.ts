import { handle, HttpError, json, isUuid, notFound } from "@/lib/http";
import { loadSession, publicState } from "@/lib/session";

export async function GET(_req: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  return handle(
    "session",
    async () => {
      const s = await loadSession(id);
      if (!s) throw new HttpError(404, "Session not found.");
      return json(publicState(s));
    },
    { sessionId: id },
  );
}
