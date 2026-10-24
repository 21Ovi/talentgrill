import { z } from "zod";
import { normalizeIndianPhone } from "./phone";

const mode = z.enum(["live", "stub"]).default("live");
const flag = z.stringbool().default(false);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.url().default("http://localhost:3000"),

  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_COOKIE_SECRET: z.string().min(32).optional(),
  AGENT_TOOL_SECRET: z.string().min(32).optional(),
  IP_HASH_SALT: z.string().min(16).optional(),
  INTERNAL_PHONES: z.string().default(""),

  PRO_PRICE_PAISE: z.coerce.number().int().min(100).default(500),
  CERT_THRESHOLD: z.coerce.number().int().min(0).max(100).default(70),

  ALLOW_STUBS: flag,
  AGENTICORG_MODE: mode,
  // Pine Labs' hackathon instance; the SDK default is app.agenticorg.ai.
  AGENTICORG_BASE_URL: z.url().default("https://agenticorg.hackathon.pinelabs.com"),
  AGENTICORG_API_KEY: z.string().min(1).optional(),
  // UUID of FresherCoachAgent (shared visibility, so API keys can run it).
  AGENTICORG_AGENT_ID: z.guid().optional(),
  // UUID of CourseCreatorAgent ("Matt"); practice courses are hidden while unset.
  AGENTICORG_COURSE_AGENT_ID: z.guid().optional(),
  // UUID of ResumeReaderAgent; FresherCoachAgent reads resumes while unset.
  AGENTICORG_RESUME_AGENT_ID: z.guid().optional(),
  ELEVENLABS_MODE: mode,
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  // ElevenLabs premade voice "Rachel"; swap for an Indian-English voice from the library.
  ELEVENLABS_VOICE_ID: z.string().min(1).default("21m00Tcm4TlvDq8ikWAM"),
  // Live two-way voice interview with the ElevenLabs interviewer agent.
  LIVE_INTERVIEW_ENABLED: z.stringbool().default(true),
  // Optional: pin an existing interviewer agent instead of creating one by name.
  ELEVENLABS_AGENT_ID: z.string().min(1).optional(),
  // Payments are on hold for the event; the upsell is hidden while false.
  PAYMENTS_ENABLED: flag,
  PINELABS_MODE: mode,
  // uat until the Pine Labs team switches the merchant to production keys.
  PINELABS_ENV: z.enum(["uat", "production"]).default("uat"),
  PINELABS_CLIENT_ID: z.string().min(1).optional(),
  PINELABS_CLIENT_SECRET: z.string().min(1).optional(),
  // Base64 secret from Dashboard > Settings; webhooks are rejected without it.
  PINELABS_WEBHOOK_SECRET: z.string().min(1).optional(),
  VOBIZ_ENABLED: flag,
});

export type Env = z.infer<typeof schema> & { internalPhones: ReadonlySet<string> };

let cached: Env | undefined;

/**
 * Parsed lazily so `next build` runs without runtime secrets. Throws an error
 * naming the bad keys (never their values).
 */
export function env(): Env {
  if (cached) return cached;
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  // Render sets RENDER_EXTERNAL_URL; APP_BASE_URL only needs setting for a custom domain.
  raw.APP_BASE_URL ??= process.env.RENDER_EXTERNAL_URL;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment: ${issues.join("; ")}`);
  }
  const internalPhones = new Set(
    parsed.data.INTERNAL_PHONES.split(",")
      .map((p) => normalizeIndianPhone(p))
      .filter((p): p is string => p !== null),
  );
  cached = { ...parsed.data, internalPhones };
  return cached;
}
