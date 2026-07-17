import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState, StatusPill } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { useBusiness } from "@/lib/business";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/quotations/")({
  head: () => ({ meta: [{ title: "Quotations — BidFlow" }] }),
  component: QuotationsPage,
});

function QuotationsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const { data: business } = useBusiness();
  const navigate = useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ["quotations", q, status],
    queryFn: async () => {
      let query = supabase.from("quotations").select("*, customers(name, company)").order("created_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status as any);
      if (q.trim()) query = query.ilike("number", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const currency = business?.currency ?? "USD";

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
     <PageHeader
  eyebrow="Quotations"
  title="Every quote you've sent"
  action={
    <Button onClick={() => navigate({ to: "/quotations/new" })}>
      <Plus className="mr-1 h-4 w-4" />
      New quotation
    </Button>
  }
/>


      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by number…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          description="Create your first quotation and win some business."
          action={<Link to="/quotations/new"><Button><Plus className="mr-1 h-4 w-4" /> New quotation</Button></Link>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elegant">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Number</th>
                <th className="px-6 py-3 text-left font-medium">Customer</th>
                <th className="px-6 py-3 text-left font-medium">Issued</th>
                <th className="px-6 py-3 text-left font-medium">Expires</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {data.map((q: any) => (
                <tr key={q.id} className="cursor-pointer hover:bg-surface-muted" onClick={() => navigate({ to: "/quotations/$quotationId", params: { quotationId: q.id } })}>
                  <td className="px-6 py-4 font-medium">{q.number}</td>
                  <td className="px-6 py-4 text-muted-foreground">{q.customers?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(q.issue_date)}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(q.expiry_date)}</td>
                  <td className="px-6 py-4"><StatusPill status={q.status} /></td>
                  <td className="px-6 py-4 text-right font-medium">{formatMoney(q.total, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
