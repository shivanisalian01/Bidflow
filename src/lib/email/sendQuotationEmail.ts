import { createServerFn } from "@tanstack/react-start";
import { Resend } from "resend";

type EmailPayload = {
  customerEmail: string;
  customerName: string;
  quotationNumber: string;
  pdfBase64: string;
};

export const sendQuotationEmail = createServerFn({
  method: "POST",
})
  .validator((data: EmailPayload) => data)
  .handler(async ({ data }) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",

      to: [data.customerEmail],

    subject: `Quotation ${data.quotationNumber} from BidFlow`,

     html: `
<div style="
  font-family: Arial, sans-serif;
  max-width: 600px;
  margin: auto;
  padding: 24px;
  color: #374151;
">

  <h2 style="color:#111827; margin-bottom:16px;">
    Hello ${data.customerName},
  </h2>

  <p>
    Thank you for your enquiry.
  </p>

  <p>
    Please find your quotation attached as a PDF.
  </p>

  <div style="
    background:#F9FAFB;
    border:1px solid #E5E7EB;
    border-radius:8px;
    padding:16px;
    margin:24px 0;
  ">

    <h3 style="margin-top:0;color:#111827;">
      Quotation Details
    </h3>

    <p><strong>Quotation No:</strong> ${data.quotationNumber}</p>

  </div>

  <p>
    If you have any questions or would like any changes,
    simply reply to this email.
  </p>

  <br>

  <p>
    Thank you for your business.
  </p>

  <p style="margin-top:32px;">
    Regards,<br>
    <strong>BidFlow Team</strong>
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #E5E7EB;">

  <p style="font-size:12px;color:#6B7280;">
    This quotation was generated automatically by BidFlow.
  </p>

</div>
`,

      attachments: [
        {
          filename: `${data.quotationNumber}.pdf`,
          content: data.pdfBase64,
        },
      ],
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });