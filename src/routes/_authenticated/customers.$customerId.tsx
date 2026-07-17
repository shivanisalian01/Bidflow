import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackLink, StatusPill } from "@/components/page-parts";
import { toast } from "sonner";
import { Trash2, Save, Plus } from "lucide-react";
import { formatDate, formatMoney, relativeDate } from "@/lib/format";
import { useBusiness } from "@/lib/business";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  head: () => ({ meta: [{ title: "Customer — BidFlow" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: business } = useBusiness();

  const { data: customer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", customerId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["customer-quotes", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotations").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["customer-notes", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_notes").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", address: "", city: "", notes: "" });
  useEffect(() => {
    if (customer) setForm({
      name: customer.name ?? "", company: customer.company ?? "", email: customer.email ?? "",
      phone: customer.phone ?? "", address: customer.address ?? "", city: customer.city ?? "", notes: customer.notes ?? "",
    });
  }, [customer]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").update(form).eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["customer", customerId] }); qc.invalidateQueries({ queryKey: ["customers"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").delete().eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Customer deleted"); qc.invalidateQueries({ queryKey: ["customers"] }); navigate({ to: "/customers" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [newNote, setNewNote] = useState("");
  const addNote = useMutation({
    mutationFn: async () => {
      if (!business || !newNote.trim()) return;
      const { error } = await supabase.from("customer_notes").insert({
        customer_id: customerId, business_id: business.id, content: newNote.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setNewNote(""); qc.invalidateQueries({ queryKey: ["customer-notes", customerId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const currency = business?.currency ?? "USD";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10 lg:py-12">
      <BackLink to="/customers" label="All customers" />
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Customer</div>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">{customer?.name ?? "…"}</h1>
          <div className="mt-1 text-sm text-muted-foreground">{customer?.company}</div>
        </div>
        <div className="flex gap-2">
          <Link to="/quotations/new" search={{ customer: customerId } as never}>
            <Button variant="outline"><Plus className="mr-1 h-4 w-4" /> New quotation</Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
                <AlertDialogDescription>This will also detach their quotations.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => del.mutate()} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
            <h2 className="mb-4 font-display text-xl font-semibold">Details</h2>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
              <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="sm:col-span-2"><Button type="submit" disabled={save.isPending}><Save className="mr-1 h-4 w-4" /> Save changes</Button></div>
            </form>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
            <h2 className="mb-4 font-display text-xl font-semibold">Quotations</h2>
            {quotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No quotations yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {quotes.map((q) => (
                  <li key={q.id}>
                    <Link to="/quotations/$quotationId" params={{ quotationId: q.id }} className="flex items-center justify-between py-3 hover:opacity-70">
                      <div>
                        <div className="text-sm font-medium">{q.number}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(q.issue_date)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill status={q.status} />
                        <div className="w-24 text-right text-sm font-medium">{formatMoney(q.total, currency)}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
            <h2 className="mb-4 font-display text-xl font-semibold">Timeline</h2>
            <form onSubmit={(e) => { e.preventDefault(); addNote.mutate(); }} className="mb-4 space-y-2">
              <Textarea placeholder="Add a note…" rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)} />
              <Button size="sm" type="submit" disabled={!newNote.trim() || addNote.isPending}>Add note</Button>
            </form>
            {notes.length === 0 ? (
              <div className="text-sm text-muted-foreground">No notes yet.</div>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-border p-3">
                    <div className="whitespace-pre-wrap text-sm">{n.content}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{relativeDate(n.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
