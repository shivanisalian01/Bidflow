import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business";
import { toast } from "sonner";
import { BackLink } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, FileText } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";

type Item = {
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
};

export const Route = createFileRoute("/_authenticated/quotations/new")({
  validateSearch: z.object({ customer: z.string().optional() }),
  head: () => ({ meta: [{ title: "New quotation — BidFlow" }] }),
  component: NewQuotation,
});

function newItem(): Item {
  return { name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 };
}

function NewQuotation() {
  const { data: business } = useBusiness();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => (await supabase.from("customers").select("id,name,company,email,phone,address,city").order("name")).data ?? [],
  });

  const today = new Date().toISOString().slice(0, 10);
  const in30 = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();

  const [form, setForm] = useState({
    customer_id: (search.customer as string | undefined) ?? "",
    number: "",
    issue_date: today,
    expiry_date: in30,
    notes: "",
    terms: "",
  });
  const [items, setItems] = useState<Item[]>([newItem()]);

  // Prefill quotation number when business loads
  useEffect(() => {
    if (business && !form.number) {
      const number = `${business.quotation_prefix}-${String(business.next_quotation_number).padStart(4, "0")}`;
      setForm((f) => ({ ...f, number }));
    }
  }, [business, form.number]);

  const currency = business?.currency ?? "USD";
  const customer = customers.find((c) => c.id === form.customer_id);

  const computed = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const lines = items.map((i) => {
      const gross = (Number(i.quantity) || 0) * (Number(i.unit_price) || 0);
      const discount = gross * (Number(i.discount_rate) || 0) / 100;
      const taxable = gross - discount;
      const tax = taxable * (Number(i.tax_rate) || 0) / 100;
      const total = taxable + tax;
      subtotal += gross;
      discountTotal += discount;
      taxTotal += tax;
      return { gross, discount, tax, total };
    });
    const grand = subtotal - discountTotal + taxTotal;
    return { lines, subtotal, discountTotal, taxTotal, grand };
  }, [items]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((it) => it.map((i, k) => (k === idx ? { ...i, ...patch } : i)));
  }
  function addItem() { setItems((it) => [...it, newItem()]); }
  function removeItem(idx: number) { setItems((it) => it.length === 1 ? it : it.filter((_, k) => k !== idx)); }

  const save = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("No business found");
      if (!form.number.trim()) throw new Error("Quotation number is required");
      const cleanItems = items.filter((i) => (i.name.trim() || i.description.trim()) && (Number(i.quantity) || 0) > 0);
      if (cleanItems.length === 0) throw new Error("Add at least one line item");

      const subtotal = computed.subtotal;
      const discount_amount = computed.discountTotal;
      const tax_amount = computed.taxTotal;
      const total = computed.grand;

      const { data: created, error } = await supabase.from("quotations").insert({
        business_id: business.id,
        customer_id: form.customer_id || null,
        number: form.number.trim(),
        status: "draft",
        issue_date: form.issue_date,
        expiry_date: form.expiry_date || null,
        notes: form.notes,
        terms: form.terms,
        tax_rate: 0,
        discount_rate: 0,
        subtotal,
        tax_amount,
        discount_amount,
        total,
      }).select().single();
      if (error) throw error;

      const rows = cleanItems.map((i, k) => ({
        quotation_id: created.id,
        business_id: business.id,
        name: i.name,
        description: i.description || i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax_rate: i.tax_rate,
        discount_rate: i.discount_rate,
        amount: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
        position: k,
      }));
      const { error: e2 } = await supabase.from("quotation_items").insert(rows);
      if (e2) throw e2;

      await supabase.from("businesses").update({ next_quotation_number: business.next_quotation_number + 1 }).eq("id", business.id);
      await supabase.from("activities").insert({
        business_id: business.id,
        kind: "quotation_created",
        message: `Created quotation ${form.number}`,
        ref_type: "quotation",
        ref_id: created.id,
      });
      return created;
    },
    onSuccess: () => {
      toast.success("Quotation created");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["business"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate({ to: "/quotations" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
      <BackLink to="/quotations" label="All quotations" />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" /> New quotation
          </div>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">{form.number || "Draft"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/quotations" })}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-1 h-4 w-4" /> {save.isPending ? "Saving…" : "Save quotation"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* FORM */}
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
            <h2 className="mb-4 font-display text-lg font-semibold">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Quotation number</Label>
                <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
              </div>
              <div>
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issue date</Label>
                <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
              </div>
              <div>
                <Label>Expiry date</Label>
                <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Line items</h2>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-4 w-4" /> Add item</Button>
            </div>
            <div className="space-y-4">
              {items.map((it, idx) => {
                const line = computed.lines[idx];
                return (
                  <div key={idx} className="rounded-xl border border-border bg-surface-muted/40 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Item {idx + 1}</div>
                      <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive" aria-label="Remove item">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label>Item name</Label>
                        <Input value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} placeholder="e.g. Website redesign" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Description</Label>
                        <Textarea rows={2} value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="Optional details…" />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Unit price</Label>
                        <Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Tax %</Label>
                        <Input type="number" step="0.01" value={it.tax_rate} onChange={(e) => updateItem(idx, { tax_rate: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Discount %</Label>
                        <Input type="number" step="0.01" value={it.discount_rate} onChange={(e) => updateItem(idx, { discount_rate: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end text-sm">
                      <span className="text-muted-foreground">Line total:&nbsp;</span>
                      <span className="font-medium">{formatMoney(line?.total ?? 0, currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
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

        {/* LIVE PREVIEW */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Live preview</div>
            <div className="rounded-2xl border border-border bg-surface p-6 text-[12px] shadow-elegant">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <div className="font-display text-lg font-semibold">{business?.name ?? "Your business"}</div>
                  {business?.address && <div className="mt-1 whitespace-pre-line text-muted-foreground">{business.address}</div>}
                  <div className="text-muted-foreground">{business?.email}{business?.phone ? ` · ${business.phone}` : ""}</div>
                  {business?.gst_number && <div className="text-muted-foreground">GST: {business.gst_number}</div>}
                </div>
                <div className="text-right">
                  <div className="font-display text-base font-semibold">Quotation</div>
                  <div className="mt-0.5 text-muted-foreground">{form.number || "—"}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Issued</div>
                  <div>{formatDate(form.issue_date)}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Valid until</div>
                  <div>{formatDate(form.expiry_date)}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Prepared for</div>
                <div className="mt-0.5 font-display text-base font-semibold">{customer?.name ?? "—"}</div>
                {customer?.company && <div>{customer.company}</div>}
                {customer?.email && <div className="text-muted-foreground">{customer.email}</div>}
              </div>

              <table className="mt-5 w-full">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Unit</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i, k) => (
                    <tr key={k} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-2">
                        <div className="font-medium">{i.name || <span className="text-muted-foreground">Item {k + 1}</span>}</div>
                        {i.description && <div className="text-muted-foreground">{i.description}</div>}
                        {(i.tax_rate > 0 || i.discount_rate > 0) && (
                          <div className="text-[10px] text-muted-foreground">
                            {i.discount_rate > 0 && <>Disc {i.discount_rate}%</>}
                            {i.tax_rate > 0 && <>{i.discount_rate > 0 ? " · " : ""}Tax {i.tax_rate}%</>}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right">{i.quantity}</td>
                      <td className="py-2 text-right">{formatMoney(i.unit_price, currency)}</td>
                      <td className="py-2 text-right font-medium">{formatMoney(computed.lines[k]?.total ?? 0, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex justify-end">
                <dl className="w-56 space-y-1.5">
                  <Row label="Subtotal" value={formatMoney(computed.subtotal, currency)} />
                  <Row label="Discount" value={`− ${formatMoney(computed.discountTotal, currency)}`} />
                  <Row label="Tax / GST" value={formatMoney(computed.taxTotal, currency)} />
                  <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-semibold">
                    <span>Grand total</span><span>{formatMoney(computed.grand, currency)}</span>
                  </div>
                </dl>
              </div>

              {(form.notes || form.terms) && (
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
                  {form.notes && <div><div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Notes</div><div className="whitespace-pre-line">{form.notes}</div></div>}
                  {form.terms && <div><div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Terms</div><div className="whitespace-pre-line">{form.terms}</div></div>}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between text-[10px] text-muted-foreground">
                <div>Thank you for your business.</div>
                {business?.signature_url ? <img src={business.signature_url} alt="Signature" className="h-8 object-contain" /> : <div className="font-display italic">— {business?.name}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-[12px]"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}
