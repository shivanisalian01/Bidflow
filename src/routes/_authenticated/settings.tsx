import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-parts";
import { useBusiness } from "@/lib/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Upload } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "AED", "JPY"];

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — BidFlow" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: business } = useBusiness();
  const qc = useQueryClient();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [form, setForm] = useState({
    name: "", logo_url: "", gst_number: "", address: "", phone: "", email: "",
    currency: "USD", quotation_prefix: "QT", next_quotation_number: 1, signature_url: "",
  });

  useEffect(() => {
    if (business) setForm({
      name: business.name, logo_url: business.logo_url ?? "", gst_number: business.gst_number ?? "",
      address: business.address ?? "", phone: business.phone ?? "", email: business.email ?? "",
      currency: business.currency, quotation_prefix: business.quotation_prefix,
      next_quotation_number: business.next_quotation_number, signature_url: business.signature_url ?? "",
    });
  }, [business]);
const uploadLogo = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  if (!business) return;

  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setUploadingLogo(true);

    const fileName = `${business.id}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("logos")
      .getPublicUrl(fileName);

    const logoUrl = data.publicUrl;

    await supabase
      .from("businesses")
      .update({
        logo_url: logoUrl,
      })
      .eq("id", business.id);

    setForm({
      ...form,
      logo_url: logoUrl,
    });

    qc.invalidateQueries({
      queryKey: ["business"],
    });

    toast.success("Logo uploaded!");
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    setUploadingLogo(false);
  }
};
  const save = useMutation({
    mutationFn: async () => {
      if (!business) return;
      const { error } = await supabase.from("businesses").update(form).eq("id", business.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["business"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const uploadSignature = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  if (!business) return;

  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setUploadingSignature(true);

    const fileName = `${business.id}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("logos")
      .getPublicUrl(fileName);

   const signatureUrl = data.publicUrl;

    await supabase
      .from("businesses")
      .update({
        signature_url: signatureUrl,
      })
      .eq("id", business.id);

    setForm({
  ...form,
  signature_url: signatureUrl,
});

    qc.invalidateQueries({
      queryKey: ["business"],
    });

    toast.success("Signature uploaded!");
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    setUploadingSignature(false);
  }
};
 
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 lg:px-10 lg:py-12">
      <PageHeader eyebrow="Settings" title="Business profile" />

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-6">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <h2 className="mb-4 font-display text-lg font-semibold">Company</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Company name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>GST / Tax number</Label><Input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} /></div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <h2 className="mb-4 font-display text-lg font-semibold">Branding</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><div className="space-y-3">
  <Label>Company Logo</Label>

  {form.logo_url ? (
    <img
      src={form.logo_url}
      alt="Logo"
      className="h-24 w-24 rounded-xl border object-contain p-2"
    />
  ) : (
    <div className="flex h-24 w-24 items-center justify-center rounded-xl border text-sm text-muted-foreground">
      No Logo
    </div>
  )}

  <Button
    type="button"
    variant="outline"
    disabled={uploadingLogo}
    asChild
  >
    <label className="cursor-pointer">
      <Upload className="mr-2 h-4 w-4" />

      {uploadingLogo ? "Uploading..." : "Upload Logo"}

      <input
        hidden
        type="file"
        accept="image/*"
        onChange={uploadLogo}
      />
    </label>
  </Button>
</div></div>
            <div className="sm:col-span-2"><div className="space-y-3">
  <Label>Digital Signature</Label>

    {form.signature_url ? (
      <img
        src={form.signature_url}
        alt="Signature"
        className="h-20 rounded-xl border object-contain p-2"
      />
    ) : (
      <div className="flex h-20 items-center justify-center rounded-xl border text-sm text-muted-foreground">
        No Signature
      </div>
    )}

    <Button
      type="button"
      variant="outline"
      disabled={uploadingSignature}
      asChild
    >
      <label className="cursor-pointer">
        <Upload className="mr-2 h-4 w-4" />

        {uploadingSignature ? "Uploading..." : "Upload Signature"}

        <input
          hidden
          type="file"
          accept="image/*"
          onChange={uploadSignature}
        />
      </label>
    </Button>
  </div>
</div></div>
        
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <h2 className="mb-4 font-display text-lg font-semibold">Quotation numbering</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Prefix</Label><Input value={form.quotation_prefix} onChange={(e) => setForm({ ...form, quotation_prefix: e.target.value })} /></div>
            <div><Label>Next number</Label><Input type="number" value={form.next_quotation_number} onChange={(e) => setForm({ ...form, next_quotation_number: Number(e.target.value) })} /></div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Next quotation will be numbered <span className="font-mono">{form.quotation_prefix}-{String(form.next_quotation_number).padStart(4, "0")}</span></p>
        </section>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={save.isPending}><Save className="mr-1 h-4 w-4" /> Save changes</Button>
        </div>
      </form>
    </div>
  );
}
