import { sendQuotationEmail } from "@/lib/email/sendQuotationEmail";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackLink, StatusPill } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Save, Copy, Printer, FileText } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { useBusiness } from "@/lib/business";
import { useRef } from "react";
import { generateQuotationPDF } from "@/lib/pdf/generateQuotationPDF";
type Item = { id?: string; name?: string; description: string; quantity: number; unit_price: number; tax_rate?: number; discount_rate?: number; position: number };

export const Route = createFileRoute("/_authenticated/quotations/$quotationId")({
  head: () => ({ meta: [{ title: "Quotation — BidFlow" }] }),
  component: QuotationPage,
});

function QuotationPage() {
  const { quotationId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: business } = useBusiness();

  const { data: quote } = useQuery({
    queryKey: ["quotation", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotations").select("*, customers(*)").eq("id", quotationId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: dbItems = [] } = useQuery({
    queryKey: ["quotation-items", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotation_items").select("*").eq("quotation_id", quotationId).order("position");
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => (await supabase.from("customers").select("id,name,company,email").order("name")).data ?? [],
  });

  const [form, setForm] = useState({
    customer_id: "" as string | null,
    number: "",
    status: "draft" as string,
    issue_date: "",
    expiry_date: "",
    notes: "",
    terms: "",
    tax_rate: 0,
    discount_rate: 0,
  });
  const [items, setItems] = useState<Item[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (quote) setForm({
      customer_id: quote.customer_id,
      number: quote.number,
      status: quote.status,
      issue_date: quote.issue_date,
      expiry_date: quote.expiry_date ?? "",
      notes: quote.notes ?? "",
      terms: quote.terms ?? "",
      tax_rate: Number(quote.tax_rate),
      discount_rate: Number(quote.discount_rate),
    });
  }, [quote]);
  useEffect(() => {
    if (dbItems.length) setItems(dbItems.map((i) => ({ id: i.id, name: (i as any).name ?? "", description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), tax_rate: Number((i as any).tax_rate ?? 0), discount_rate: Number((i as any).discount_rate ?? 0), position: i.position })));
    else if (quote && dbItems.length === 0) setItems([{ description: "", quantity: 1, unit_price: 0, position: 0 }]);
  }, [dbItems, quote]);

  const currency = business?.currency ?? "USD";

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
    const discount_amount = subtotal * (Number(form.discount_rate) || 0) / 100;
    const taxable = subtotal - discount_amount;
    const tax_amount = taxable * (Number(form.tax_rate) || 0) / 100;
    const total = taxable + tax_amount;
    return { subtotal, discount_amount, tax_amount, total };
  }, [items, form.tax_rate, form.discount_rate]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((it) => it.map((i, k) => (k === idx ? { ...i, ...patch } : i)));
  }
  function addItem() {
    setItems((it) => [...it, { description: "", quantity: 1, unit_price: 0, position: it.length }]);
  }
  function removeItem(idx: number) {
    setItems((it) => it.filter((_, k) => k !== idx).map((i, k) => ({ ...i, position: k })));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("No business");
      const payload = {
        customer_id: form.customer_id || null,
        number: form.number,
        status: form.status as any,
        issue_date: form.issue_date,
        expiry_date: form.expiry_date || null,
        notes: form.notes,
        terms: form.terms,
        tax_rate: form.tax_rate,
        discount_rate: form.discount_rate,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        discount_amount: totals.discount_amount,
        total: totals.total,
      };
      const { error } = await supabase.from("quotations").update(payload).eq("id", quotationId);
      if (error) throw error;
      // Replace items: delete all then insert
      await supabase.from("quotation_items").delete().eq("quotation_id", quotationId);
      if (items.length) {
        const insertRows = items.map((i, k) => ({
          quotation_id: quotationId,
          business_id: business.id,
          name: i.name ?? "",
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          tax_rate: i.tax_rate ?? 0,
          discount_rate: i.discount_rate ?? 0,
          amount: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
          position: k,
        }));
        const { error: e2 } = await supabase.from("quotation_items").insert(insertRows);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Quotation saved");
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      qc.invalidateQueries({ queryKey: ["quotation-items", quotationId] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("quotations").update({ status: status as any }).eq("id", quotationId);
      if (error) throw error;
      if (business) {
        await supabase.from("activities").insert({
          business_id: business.id,
          kind: `quotation_${status}`,
         message: `Quotation ${form.number} marked as ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          ref_type: "quotation", ref_id: quotationId,
        });
      }
    },
    onSuccess: (_d, status) => {
      toast.success(`Marked as ${status}`);
      setForm((f) => ({ ...f, status }));
      qc.invalidateQueries({ queryKey: ["quotation", quotationId] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quotations").delete().eq("id", quotationId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["quotations"] }); navigate({ to: "/quotations" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("No business");
      const number = `${business.quotation_prefix}-${String(business.next_quotation_number).padStart(4, "0")}`;
      const { data: newQ, error } = await supabase.from("quotations").insert({
        business_id: business.id,
        customer_id: form.customer_id,
        number,
        status: "draft",
        issue_date: new Date().toISOString().slice(0, 10),
        expiry_date: form.expiry_date,
        notes: form.notes,
        terms: form.terms,
        tax_rate: form.tax_rate,
        discount_rate: form.discount_rate,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        discount_amount: totals.discount_amount,
        total: totals.total,
      }).select().single();
      if (error) throw error;
      await supabase.from("businesses").update({ next_quotation_number: business.next_quotation_number + 1 }).eq("id", business.id);
      if (items.length) {
        await supabase.from("quotation_items").insert(items.map((i, k) => ({
          quotation_id: newQ.id, business_id: business.id, name: i.name ?? "", description: i.description,
          quantity: i.quantity, unit_price: i.unit_price, tax_rate: i.tax_rate ?? 0, discount_rate: i.discount_rate ?? 0,
          amount: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), position: k,
        })));
      }
      return newQ;
    },
    onSuccess: (data) => { toast.success("Duplicated"); navigate({ to: "/quotations/$quotationId", params: { quotationId: data.id } }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!quote) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  const customer = customers.find((c) => c.id === form.customer_id);
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };

    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10 lg:py-12">
      <div className="no-print">
        <BackLink to="/quotations" label="All quotations" />
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" /> Quotation
              <StatusPill status={form.status} />
            </div>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">{form.number}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={form.status} onValueChange={(v) => setStatus.mutate(v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print / PDF</Button>
  <Button
  variant="outline"
  onClick={async () => {
    try {
      const blob = await generateQuotationPDF({
        business,
        customer,
        form,
        items,
        totals,
        currency,
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${form.number}.pdf`;
      a.click();

      URL.revokeObjectURL(url);

      toast.success("PDF downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  }}
>
  📄 Download PDF
</Button>         
<Button
  variant="outline"
  onClick={async () => {
    try {
      if (!customer?.email) {
        toast.error("Customer email not found");
        return;
      }

      const blob = await generateQuotationPDF({
        business,
        customer,
        form,
        items,
        totals,
        currency,
      });

      const pdfBase64 = await blobToBase64(blob);

      await sendQuotationEmail({
        data: {
          customerEmail: customer.email,
          customerName: customer.name,
          quotationNumber: form.number,
          pdfBase64,
        },
      });
      await setStatus.mutateAsync("sent");

      toast.success("Quotation emailed successfully!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to send email");
    }
  }}
>
  📧 Send Email
</Button>
            <Button variant="outline" onClick={() => duplicate.mutate()}><Copy className="mr-1 h-4 w-4" /> Duplicate</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-1 h-4 w-4" /> Save</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete this quotation?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => del.mutate()} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Editor */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant lg:col-span-2">
            <h2 className="mb-4 font-display text-lg font-semibold">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Number</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
              <div>
                <Label>Customer</Label>
                <Select value={form.customer_id ?? ""} onValueChange={(v) => setForm({ ...form, customer_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Issue date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div><Label>Expiry date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
            <h2 className="mb-4 font-display text-lg font-semibold">Totals</h2>
            <div className="grid gap-3">
              <div><Label>Discount %</Label><Input type="number" step="0.01" value={form.discount_rate} onChange={(e) => setForm({ ...form, discount_rate: Number(e.target.value) })} /></div>
              <div><Label>Tax %</Label><Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} /></div>
            </div>
            <dl className="mt-6 space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
              <Row label={`Discount (${form.discount_rate}%)`} value={`− ${formatMoney(totals.discount_amount, currency)}`} />
              <Row label={`Tax (${form.tax_rate}%)`} value={formatMoney(totals.tax_amount, currency)} />
              <div className="mt-3 border-t border-border pt-3 flex justify-between font-display text-lg font-semibold">
                <span>Total</span><span>{formatMoney(totals.total, currency)}</span>
              </div>
            </dl>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Line items</h2>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-4 w-4" /> Add item</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left">Description</th>
                  <th className="pb-2 w-24 text-right">Qty</th>
                  <th className="pb-2 w-32 text-right">Unit price</th>
                  <th className="pb-2 w-32 text-right">Amount</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="py-2 pr-2"><Input value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="Item or service…" /></td>
                    <td className="py-2 pr-2"><Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} className="text-right" /></td>
                    <td className="py-2 pr-2"><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} className="text-right" /></td>
                    <td className="py-2 pr-2 text-right font-medium">{formatMoney((Number(it.quantity) || 0) * (Number(it.unit_price) || 0), currency)}</td>
                    <td className="py-2 text-right"><button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No items yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
            <Label>Notes</Label>
            <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes for the customer…" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
            <Label>Terms & conditions</Label>
            <Textarea rows={4} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="Payment terms, delivery, etc." />
          </div>
        </section>
      </div>

      {/* Printable view */}
      <div ref={printRef}>
  <PrintView
    business={business}
    customer={customer}
    form={form}
    items={items}
    totals={totals}
    currency={currency}
  />
</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}

function PrintView({ business, customer, form, items, totals, currency }: any) {
  return (
    <div className="hidden print:block">
      <div className="p-12 text-[13px] text-foreground">
        <div className="flex items-start justify-between border-b border-border pb-8">
          
           <div className="flex items-start gap-4">
  {business?.logo_url && (
    <img
      src={business.logo_url}
      alt="Company Logo"
      className="h-16 w-16 rounded-lg object-contain"
    />
  )}

  <div>
    <div className="font-display text-3xl font-semibold">
      {business?.name}
    </div>

    <div className="mt-2 whitespace-pre-line text-muted-foreground">
      {business?.address}
    </div>

    <div className="text-muted-foreground">
      {business?.email} · {business?.phone}
    </div>

    {business?.gst_number && (
      <div className="text-muted-foreground">
        GST: {business.gst_number}
      </div>
    )}
  </div>
</div>
          <div className="text-right">
            <div className="font-display text-2xl font-semibold">Quotation</div>
            <div className="mt-1 text-muted-foreground">{form.number}</div>
            <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Issued</div>
            <div>{formatDate(form.issue_date)}</div>
            {form.expiry_date && <><div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Valid until</div><div>{formatDate(form.expiry_date)}</div></>}
          </div>
        </div>

        <div className="mt-8">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Prepared for</div>
          <div className="mt-1 font-display text-xl font-semibold">{customer?.name ?? "—"}</div>
          {customer?.company && <div>{customer.company}</div>}
        </div>

        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-3">Description</th>
              <th className="pb-3 text-right">Qty</th>
              <th className="pb-3 text-right">Unit</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i: any, k: number) => (
              <tr key={k} className="border-b border-border/60">
                <td className="py-3">{i.description}</td>
                <td className="py-3 text-right">{i.quantity}</td>
                <td className="py-3 text-right">{formatMoney(i.unit_price, currency)}</td>
                <td className="py-3 text-right font-medium">{formatMoney((i.quantity || 0) * (i.unit_price || 0), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-72 space-y-2">
            <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
            <Row label={`Discount (${form.discount_rate}%)`} value={`− ${formatMoney(totals.discount_amount, currency)}`} />
            <Row label={`Tax (${form.tax_rate}%)`} value={formatMoney(totals.tax_amount, currency)} />
            <div className="mt-3 border-t border-border pt-3 flex justify-between font-display text-lg font-semibold">
              <span>Total</span><span>{formatMoney(totals.total, currency)}</span>
            </div>
          </dl>
        </div>

        {(form.notes || form.terms) && (
          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-border pt-6 text-sm">
            {form.notes && <div><div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Notes</div><div className="whitespace-pre-line">{form.notes}</div></div>}
            {form.terms && <div><div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Terms</div><div className="whitespace-pre-line">{form.terms}</div></div>}
          </div>
        )}

        <div className="mt-16 flex justify-between text-xs text-muted-foreground">
          <div>Thank you for your business.</div>
          {business?.signature_url ? <img src={business.signature_url} alt="Signature" className="h-14 object-contain" /> : <div className="font-display italic">— {business?.name}</div>}
        </div>
      </div>
    </div>
  );
}
