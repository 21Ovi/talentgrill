import type { Metadata } from "next";
import Link from "next/link";
import { AdminControls, AdminLogin } from "@/components/Admin";
import { Brand, Sheet } from "@/components/ui";
import { adminConfig, isAdmin } from "@/lib/admin";
import { loadAdminStats, type Breakdown, type Funnel, type Range, type RecentSignup } from "@/lib/adminStats";

export const metadata: Metadata = {
  title: "Admin · TalentGrill",
  robots: { index: false, follow: false },
};

const IST: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };

export default async function AdminPage(props: PageProps<"/admin">) {
  const range: Range = (await props.searchParams).range === "all" ? "all" : "today";

  if (!adminConfig()) {
    return (
      <Shell>
        <Sheet className="mx-auto mt-10 w-full max-w-sm">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Admin isn&apos;t set up</h1>
          <p className="mt-2 text-[15px] text-muted">
            Add <code>ADMIN_PASSWORD</code> (8+ characters) and <code>ADMIN_COOKIE_SECRET</code> (32+ characters) in
            Render&apos;s Environment tab, then redeploy.
          </p>
        </Sheet>
      </Shell>
    );
  }
  if (!(await isAdmin())) {
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );
  }

  const stats = await loadAdminStats(range);
  const renderedAt = new Date().toISOString();

  return (
    <Shell controls={<AdminControls renderedAt={renderedAt} />}>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Signups today" value={stats.signupsToday} />
        <Stat label="Signups in total" value={stats.signupsTotal} />
        <Stat label="Came by referral" value={stats.referred} />
        <Stat label={range === "today" ? "Paid today" : "Paid in total"} value={stats.funnel.paid} />
      </section>

      <Sheet className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold">Interview funnel</h2>
            <p className="text-sm text-muted">Each step as a share of interviews started.</p>
          </div>
          <RangeSwitch range={range} />
        </div>
        <FunnelBars funnel={stats.funnel} />
      </Sheet>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BreakdownTable title="Where signups came from" column="Source" note="From the ?src= tag on the link; no tag counts as direct." rows={stats.sources} />
        <BreakdownTable title="Roles" column="Role" note="The role picked at signup." rows={stats.roles} />
      </div>

      <RecentTable rows={stats.recent} />

      <p className="pb-10 text-sm text-faint">
        Counts leave out {stats.excluded} internal or event-staff signup{stats.excluded === 1 ? "" : "s"}; they still appear in the
        list above, tagged. Paid counts only live Pine Labs payments, not sandbox ones.
      </p>
    </Shell>
  );
}

function Shell({ controls, children }: { controls?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <Brand />
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-[13px] font-semibold text-muted">Admin</span>
        </span>
        {controls}
      </header>
      {children}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-[22px] bg-surface p-4 ring-1 ring-line ring-inset">
      <span className="text-[30px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value.toLocaleString("en-IN")}</span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

function RangeSwitch({ range }: { range: Range }) {
  const options: { value: Range; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "all", label: "All time" },
  ];
  return (
    <nav aria-label="Funnel range" className="flex rounded-full bg-sunken p-1 text-sm font-semibold">
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.value === "today" ? "/admin" : "/admin?range=all"}
          aria-current={range === o.value ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 transition-colors ${range === o.value ? "bg-surface text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

const STAGES: { key: keyof Funnel; label: string }[] = [
  { key: "started", label: "Started an interview" },
  { key: "answeredOne", label: "Answered a question" },
  { key: "answeredTwo", label: "Answered both free questions" },
  { key: "feedback", label: "Got quick feedback" },
  { key: "upsell", label: "Tapped unlock" },
  { key: "paid", label: "Paid for the full mock" },
];

function FunnelBars({ funnel }: { funnel: Funnel }) {
  const base = funnel.started;
  return (
    <ol className="flex flex-col gap-3">
      {STAGES.map((s) => {
        const n = funnel[s.key];
        const pct = base ? Math.round((n / base) * 100) : 0;
        return (
          <li key={s.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 sm:grid-cols-[14rem_minmax(0,1fr)_5.5rem] sm:items-center">
            <span className="text-[15px]">{s.label}</span>
            <span className="text-right text-[15px] tabular-nums sm:order-last">
              <span className="font-semibold">{n.toLocaleString("en-IN")}</span>
              <span className="ml-1.5 text-muted">{pct}%</span>
            </span>
            <span className="col-span-2 h-2.5 overflow-hidden rounded-full bg-sunken sm:col-span-1">
              <span
                className="block h-full origin-left rounded-full bg-ember transition-[scale] duration-700 ease-out-soft"
                style={{ scale: `${base ? n / base : 0} 1` }}
              />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function BreakdownTable({ title, column, note, rows }: { title: string; column: string; note: string; rows: Breakdown }) {
  return (
    <Sheet className="flex flex-col gap-3">
      <div>
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <p className="text-sm text-muted">{note}</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-[15px] text-muted">No signups yet.</p>
      ) : (
        <table className="w-full text-[15px]">
          <thead>
            <tr className="text-left text-sm text-muted">
              <th className="py-2 font-medium">{column}</th>
              <th className="w-20 py-2 text-right font-medium">Today</th>
              <th className="w-20 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line">
                <td className="py-2.5">{r.label}</td>
                <td className="py-2.5 text-right tabular-nums">{r.today}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Sheet>
  );
}

function RecentTable({ rows }: { rows: RecentSignup[] }) {
  return (
    <Sheet className="flex flex-col gap-3">
      <div>
        <h2 className="text-[17px] font-semibold">Latest signups</h2>
        <p className="text-sm text-muted">The 25 most recent, newest first. Phone numbers are partly hidden.</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-[15px] text-muted">No signups yet. Share the QR to get the first one.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
          <table className="w-full min-w-[640px] text-[15px]">
            <thead>
              <tr className="text-left text-sm text-muted">
                <th className="py-2 font-medium">When</th>
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Mobile</th>
                <th className="py-2 font-medium">Role</th>
                <th className="py-2 font-medium">Source</th>
                <th className="py-2 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.createdAt}-${i}`} className="border-t border-line align-top">
                  <td className="py-2.5 whitespace-nowrap tabular-nums text-muted">
                    {new Date(r.createdAt).toLocaleString("en-IN", { ...IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="py-2.5">
                    {r.name}
                    {r.excluded && <Tag>{r.excluded}</Tag>}
                    {r.referred && <Tag>referred</Tag>}
                  </td>
                  <td className="py-2.5 whitespace-nowrap tabular-nums">{r.phone}</td>
                  <td className="py-2.5">{r.role}</td>
                  <td className="py-2.5">{r.source}</td>
                  <td className="py-2.5 whitespace-nowrap text-muted">
                    {r.answers} answer{r.answers === 1 ? "" : "s"}
                    {r.feedback ? ", feedback" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Sheet>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-xs font-semibold text-muted">{children}</span>;
}
