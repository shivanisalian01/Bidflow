import { pdf } from "@react-pdf/renderer";
import QuotationPDF from "@/components/pdf/QuotationPDF";

export async function generateQuotationPDF(data: any) {
  const blob = await pdf(
    <QuotationPDF
      business={data.business}
      customer={data.customer}
      form={data.form}
      items={data.items}
      totals={data.totals}
      currency={data.currency}
    />
  ).toBlob();

  return blob;
}