import { randomInt } from "node:crypto";
import { z } from "zod";
import { pool, tx } from "@/lib/db";
import { env } from "@/lib/env";
import { logEvent, requestMeta } from "@/lib/events";
import { handle, HttpError, json, readJson } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { normalizeIndianPhone } from "@/lib/phone";
import { clientIp, take } from "@/lib/rateLimit";
import { ROLES } from "@/lib/roles";

const CONSENT_TEXT = "We store your answers to give you feedback. We never share your number.";
const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const Body = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(60, "Please use a shorter name.")
    .transform((s) => s.replace(/\s+/g, " ")),
  phone: z
    .string()
    .transform((p, ctx) => {
      const normalized = normalizeIndianPhone(p);
      if (!normalized) ctx.addIssue({ code: "custom", message: "Enter a 10-digit Indian mobile number." });
      return normalized ?? "";
    }),
  password: z
    .string()
    .min(8, "Use at least 8 characters for your password.")
    .max(128, "Please use a shorter password."),
  role: z.enum(ROLES.map((r) => r.id) as [string, ...string[]], { error: "Pick the role you're preparing for." }),
  consent: z.literal(true, { error: "Please accept the consent note to continue." }),
  isEventStaff: z.boolean().default(false),
  ref: z.string().trim().toUpperCase().max(12).optional(),
  src: z
    .string()
    .trim()
    .toLowerCase()
    .max(20)
    .regex(/^[a-z0-9_-]*$/)
    .optional()
    .catch(undefined),
});

function refCode(): string {
  return Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("");
}

export async function POST(req: Request) {
  return handle("signup", async () => {
    const ip = clientIp(req);
    if (!take(`signup:ip:${ip}`, 40, 1 / 3)) {
      throw new HttpError(429, "Lots of people are signing up from this network. Please try again in a few seconds.");
    }
    const body = await readJson(req, Body);
    if (!take(`signup:phone:${body.phone}`, 5, 1 / 60)) {
      throw new HttpError(429, "Too many attempts for this number. Please wait a minute.");
    }

    // A number that already has a password needs it; one from before passwords gets this one.
    const [existing] = (
      await pool().query<{ password_hash: string | null }>("select password_hash from users where phone = $1", [body.phone])
    ).rows;
    if (existing?.password_hash && !(await verifyPassword(body.password, existing.password_hash))) {
      throw new HttpError(409, "This number already has an account. Log in instead (joined before passwords? Your temporary password is on the log-in page).");
    }
    const passwordHash = existing?.password_hash ?? (await hashPassword(body.password));

    const isInternal = env().internalPhones.has(body.phone);
    const meta = requestMeta(req);

    const result = await tx(async (db) => {
      const referrer = body.ref
        ? (await db.query<{ id: string }>("select id from users where ref_code = $1 and phone <> $2", [body.ref, body.phone]))
            .rows[0]
        : undefined;

      // Upsert by phone; retry if the random ref code collides with an existing one.
      let user: { id: string; inserted: boolean } | undefined;
      for (let attempt = 0; !user; attempt++) {
        await db.query("savepoint upsert_user");
        try {
          const { rows } = await db.query<{ id: string; inserted: boolean }>(
            `insert into users (name, phone, role_target, ref_code, referred_by, source, is_internal, is_event_staff, consent_at, password_hash)
             values ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9)
             on conflict (phone) do update set
               name = excluded.name,
               password_hash = coalesce(users.password_hash, excluded.password_hash),
               role_target = excluded.role_target,
               is_internal = excluded.is_internal,
               is_event_staff = users.is_event_staff or excluded.is_event_staff
             returning id, (xmax = 0) as inserted`,
            [
              body.name,
              body.phone,
              body.role,
              refCode(),
              referrer?.id ?? null,
              body.src ?? "direct",
              isInternal,
              body.isEventStaff,
              passwordHash,
            ],
          );
          user = rows[0];
        } catch (err) {
          await db.query("rollback to savepoint upsert_user");
          const refCollision = (err as { constraint?: string }).constraint === "users_ref_code_key";
          if (!refCollision || attempt >= 3) throw err;
        }
      }

      const { rows } = await db.query<{ id: string }>(
        "insert into sessions (user_id, role) values ($1, $2) returning id",
        [user.id, body.role],
      );
      const sessionId = rows[0].id;

      await logEvent(
        {
          actor: "user",
          type: user.inserted ? "user_signed_up" : "user_returned",
          userId: user.id,
          sessionId,
          payload: {
            role: body.role,
            source: body.src ?? "direct",
            ref: body.ref ?? null,
            referred_by: referrer?.id ?? null,
            is_internal: isInternal,
            is_event_staff: body.isEventStaff,
            consent_text: CONSENT_TEXT,
            ...meta,
          },
        },
        db,
      );
      await logEvent({ actor: "user", type: "session_started", userId: user.id, sessionId, payload: { role: body.role } }, db);
      return { sessionId };
    });

    return json(result, 201);
  });
}
