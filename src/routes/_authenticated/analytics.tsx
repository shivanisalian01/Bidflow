import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-parts";
import { useBusiness } from "@/lib/business";
import { formatMoney } from "@/lib/format";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — BidFlow" }] }),
  component: Analytics,
});

function Analytics() {
  const { data: business } = useBusiness();
  const currency = business?.currency ?? "USD";

  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [q, c] = await Promise.all([
        supabase.from("quotations").select("id,status,total,issue_date,created_at"),
        supabase.from("customers").select("id,created_at"),
      ]);
      const qs = q.data ?? [];
      const cs = c.data ?? [];

      // Monthly revenue + count
      const months: { key: string; label: string; revenue: number; sent: number; accepted: number; customers: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ key, label: d.toLocaleDateString("en-US", { month: "short" }), revenue: 0, sent: 0, accepted: 0, customers: 0 });
      }
      const bucket = (dateStr: string) => {
        const d = new Date(dateStr);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return months.find((m) => m.key === key);
      };
      qs.forEach((x) => {
        const m = bucket(x.created_at);
        if (!m) return;
        m.sent += 1;
        if (x.status === "accepted") { m.accepted += 1; m.revenue += Number(x.total); }
      });
      cs.forEach((x) => { const m = bucket(x.created_at); if (m) m.customers += 1; });

      // Status distribution
      const statusCounts = ["draft", "sent", "accepted", "rejected", "expired"].map((s) => ({
        name: s, value: qs.filter((q) => q.status === s).length,
      }));

      return { months, statusCounts, total: qs.length };
    },
  });

  const COLORS = ["var(--color-muted-foreground)", "var(--color-accent)", "var(--color-success)", "var(--color-destructive)", "var(--color-muted-foreground)"];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Analytics" title="Business performance" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold">Revenue (12 months)</h2>
          <div className="h-72"><ResponsiveContainer>
            <BarChart data={data?.months ?? []}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v, currency).replace(/\.\d+/, "")} />
              <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => formatMoney(v, currency)} />
              <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <h2 className="mb-4 font-display text-lg font-semibold">Status mix</h2>
          <div className="h-72"><ResponsiveContainer>
            <PieChart>
              <Pie data={data?.statusCounts ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {(data?.statusCounts ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer></div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold">Quotations sent vs accepted</h2>
          <div className="h-72"><ResponsiveContainer>
            <LineChart data={data?.months ?? []}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="sent" stroke="var(--color-primary)" strokeWidth={2} />
              <Line type="monotone" dataKey="accepted" stroke="var(--color-success)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer></div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <h2 className="mb-4 font-display text-lg font-semibold">Customer growth</h2>
          <div className="h-72"><ResponsiveContainer>
            <BarChart data={data?.months ?? []}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="customers" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
}
