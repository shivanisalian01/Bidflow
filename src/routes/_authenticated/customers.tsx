import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/lib/business";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — BidFlow" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { data: business } = useBusiness();
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ["customers", q],
    queryFn: async () => {
      let query = supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (q.trim()) query = query.or(`name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", address: "", city: "", notes: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("No business");
      if (!form.name.trim()) throw new Error("Name required");
      const { data, error } = await supabase.from("customers").insert({ ...form, business_id: business.id }).select().single();
      if (error) throw error;
      await supabase.from("activities").insert({
        business_id: business.id, kind: "customer_created", message: `Added customer ${data.name}`, ref_type: "customer", ref_id: data.id,
      });
      return data;
    },
    onSuccess: (data) => {
      setOpen(false);
      setForm({ name: "", company: "", email: "", phone: "", address: "", city: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Customer added");
      navigate({ to: "/customers/$customerId", params: { customerId: data.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
      <PageHeader
        eyebrow="Customers"
        title="Your customer roster"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New customer</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">New customer</DialogTitle>
                <DialogDescription>Create a new customer record.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter className="sm:col-span-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={create.isPending}>Create customer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <EmptyState title="No customers yet" description="Add your first customer to start sending quotations." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elegant">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Name</th>
                <th className="px-6 py-3 text-left font-medium">Company</th>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">Phone</th>
                <th className="px-6 py-3 text-left font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {data.map((c) => (
                <tr key={c.id} className="cursor-pointer transition-colors hover:bg-surface-muted" onClick={() => navigate({ to: "/customers/$customerId", params: { customerId: c.id } })}>
                  <td className="px-6 py-4 font-medium">
                    <Link to="/customers/$customerId" params={{ customerId: c.id }} className="hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{c.company ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
