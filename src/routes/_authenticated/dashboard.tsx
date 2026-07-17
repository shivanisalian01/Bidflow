import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business";
import { formatMoney, formatDate, relativeDate } from "@/lib/format";
import { ArrowUpRight, FileText, Users, TrendingUp, CircleDollarSign } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BidFlow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: business } = useBusiness();
  const currency = business?.currency ?? "USD";

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [q, c, a] = await Promise.all([
        supabase.from("quotations").select("id,status,total,issue_date,expiry_date,number,customer_id,created_at").order("created_at", { ascending: false }),
        supabase.from("customers").select("id,name,company,created_at").order("created_at", { ascending: false }),
        supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      if (q.error) throw q.error;
      if (c.error) throw c.error;
      const qs = q.data ?? [];
      const revenue = qs.filter((x) => x.status === "accepted").reduce((s, x) => s + Number(x.total), 0);
      const pending = qs.filter((x) => x.status === "sent").length;
      const accepted = qs.filter((x) => x.status === "accepted").length;
      const total = qs.length;
      const conv = total ? Math.round((accepted / total) * 100) : 0;
      // monthly revenue - last 6 months
      const months: { key: string; label: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ key, label: d.toLocaleDateString("en-US", { month: "short" }), revenue: 0 });
      }
      qs.forEach((x) => {
        if (x.status !== "accepted") return;
        const d = new Date(x.issue_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const m = months.find((mm) => mm.key === key);
        if (m) m.revenue += Number(x.total);
      });
      // upcoming expiry - next 14 days
      const now = new Date();
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 14);
      const upcoming = qs.filter((x) => x.status === "sent" && x.expiry_date && new Date(x.expiry_date) >= now && new Date(x.expiry_date) <= cutoff);
      return {
        revenue, pending, accepted, total, conv, months,
        recentQuotes: qs.slice(0, 5),
        recentCustomers: (c.data ?? []).slice(0, 5),
        customerCount: (c.data ?? []).length,
        upcoming,
        activities: a.data ?? [],
      };
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
      <header className="mb-10">
        <div className="text-sm text-muted-foreground">Overview</div>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
          {greet()}, welcome back.
        </h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(stats?.revenue ?? 0, currency)} icon={CircleDollarSign} hint="Accepted quotations" />
        <StatCard label="Customers" value={String(stats?.customerCount ?? 0)} icon={Users} />
        <StatCard label="Pending" value={String(stats?.pending ?? 0)} icon={FileText} hint="Sent, awaiting reply" />
        <StatCard label="Conversion" value={`${stats?.conv ?? 0}%`} icon={TrendingUp} hint={`${stats?.accepted ?? 0} of ${stats?.total ?? 0} accepted`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">Monthly revenue</h2>
            <div className="text-xs text-muted-foreground">Last 6 months</div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={stats?.months ?? []}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v, currency).replace(/\.\d+/, "")} />
                <Tooltip
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatMoney(v, currency)}
                />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-accent)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <h2 className="mb-4 font-display text-xl font-semibold">Upcoming follow-ups</h2>
          {stats?.upcoming?.length ? (
            <ul className="space-y-3">
              {stats.upcoming.map((q) => (
                <li key={q.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <Link to="/quotations/$quotationId" params={{ quotationId: q.id }} className="block truncate text-sm font-medium hover:underline">
                      {q.number}
                    </Link>
                    <div className="text-xs text-muted-foreground">Expires {formatDate(q.expiry_date)}</div>
                  </div>
                  <div className="text-sm font-medium">{formatMoney(q.total, currency)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No quotations expiring soon.
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Recent quotations</h2>
            <Link to="/quotations" className="text-xs font-medium text-muted-foreground hover:text-foreground">View all <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link>
          </div>
          {stats?.recentQuotes?.length ? (
            <ul className="divide-y divide-border">
              {stats.recentQuotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between py-3">
                  <Link to="/quotations/$quotationId" params={{ quotationId: q.id }} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium hover:underline">{q.number}</div>
                    <div className="text-xs text-muted-foreground">{relativeDate(q.created_at)}</div>
                  </Link>
                  <StatusPill status={q.status} />
                  <div className="ml-4 w-24 text-right text-sm font-medium">{formatMoney(q.total, currency)}</div>
                </li>
              ))}
            </ul>
          ) : <Empty label="No quotations yet." />}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Recent customers</h2>
            <Link to="/customers" className="text-xs font-medium text-muted-foreground hover:text-foreground">View all <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link>
          </div>
          {stats?.recentCustomers?.length ? (
            <ul className="divide-y divide-border">
              {stats.recentCustomers.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <Link to="/customers/$customerId" params={{ customerId: c.id }} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium hover:underline">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.company ?? "—"}</div>
                  </Link>
                  <div className="text-xs text-muted-foreground">{relativeDate(c.created_at)}</div>
                </li>
              ))}
            </ul>
          ) : <Empty label="No customers yet." />}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-elegant">
        <h2 className="mb-4 font-display text-xl font-semibold">Activity</h2>
        {stats?.activities?.length ? (
          <ul className="space-y-3">
            {stats.activities.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{a.message}</div>
                  <div className="text-xs text-muted-foreground">{relativeDate(a.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : <Empty label="No activity yet." />}
      </div>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string; icon: any; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-accent/20 text-accent-foreground",
    accepted: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    expired: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles[status] ?? styles.draft}`}>{status}</span>;
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{label}</div>;
}
