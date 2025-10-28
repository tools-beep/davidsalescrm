import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://app.stafflyhq.ai"; // Your app URL
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/invoice-webhook`; // Supabase Edge Function URL

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceData {
  invoice_id: string;
  user_id: string;
  client_name: string;
  client_email: string;
  start_date: string;
  end_date: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { invoice_id, user_id, client_name, client_email, start_date, end_date }: InvoiceData = await req.json();

    console.log("Generating invoice for:", { invoice_id, client_name, client_email });

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, email")
      .eq("user_id", user_id)
      .single();

    if (profileError || !userProfile) {
      throw new Error("User profile not found");
    }

    const userName = `${userProfile.first_name} ${userProfile.last_name}`;

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    // Fetch invoice items (task breakdown)
    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice_id)
      .order("task_date", { ascending: true });

    if (itemsError) {
      throw new Error("Failed to fetch invoice items");
    }

    // Generate PDF content (HTML that will be converted to PDF)
    const pdfHtml = generateInvoicePDF(invoice, items || [], userName, userProfile.email);

    // Generate approval/rejection links (pointing to Supabase Edge Function)
    const approveUrl = `${WEBHOOK_URL}?action=approve&id=${invoice_id}&email=${encodeURIComponent(client_email)}`;
    const rejectUrl = `${WEBHOOK_URL}?action=reject&id=${invoice_id}&email=${encodeURIComponent(client_email)}`;

    // Generate email HTML
    const emailHtml = generateEmailHtml(invoice, items || [], userName, approveUrl, rejectUrl);

    // Validate email addresses
    if (!client_email || !client_email.includes('@')) {
      throw new Error(`Invalid client email: ${client_email}`);
    }

    console.log("Preparing to send email to:", { client_email, miguel: "miguel@migueldiaz.ca" });

    // Generate PDF using an external API (PDFShift or similar)
    // For now, we'll use a better HTML attachment approach
    let pdfBase64 = null;
    
    try {
      // Try to generate PDF using PDFShift API (if available)
      const pdfShiftApiKey = Deno.env.get("PDFSHIFT_API_KEY");
      
      if (pdfShiftApiKey) {
        console.log("Generating PDF using PDFShift...");
        const pdfResponse = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(pdfShiftApiKey + ":")}`,
          },
          body: JSON.stringify({
            source: pdfHtml,
            sandbox: false,
            format: "Letter",
            margin: "0.5in",
          }),
        });

        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
          console.log("PDF generated successfully");
        } else {
          console.warn("PDF generation failed, will send HTML attachment instead");
        }
      }
    } catch (error) {
      console.warn("PDF generation error:", error.message);
    }

    // Prepare attachments
    const attachments = [];
    
    if (pdfBase64) {
      // Send as PDF if generation succeeded
      attachments.push({
        filename: `Invoice_${invoice.invoice_number}.pdf`,
        content: pdfBase64,
      });
    } else {
      // Fallback: Send as HTML attachment
      attachments.push({
        filename: `Invoice_${invoice.invoice_number}.html`,
        content: btoa(pdfHtml),
      });
    }

    // Send email via Resend
    const emailPayload = {
      from: "Staffly <noreply@admin.stafflyhq.ai>",
      to: [client_email, "miguel@migueldiaz.ca"],
      subject: `Invoice ${invoice.invoice_number} - ${client_name}`,
      html: emailHtml,
      attachments,
    };

    console.log("Sending email with payload:", JSON.stringify({ 
      ...emailPayload, 
      html: "[HTML CONTENT]", 
      attachments: attachments.map(a => ({ filename: a.filename, size: a.content.length }))
    }));

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();
    
    if (!resendResponse.ok) {
      console.error("Resend error response:", resendData);
      throw new Error(`Failed to send email: ${JSON.stringify(resendData)}`);
    }

    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice email sent successfully",
        email_id: resendData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generateInvoicePDF(invoice: any, items: any[], userName: string, userEmail: string): string {
  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(item.task_date).toLocaleDateString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.task_description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.hours.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.rate || 0).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.amount || 0).toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-info { font-size: 24px; font-weight: bold; color: #2563eb; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: bold; color: #1f2937; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
    .total-row { font-size: 18px; font-weight: bold; background-color: #f9fafb; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">Staffly</div>
    <div class="invoice-info">
      <div class="invoice-number">INVOICE</div>
      <div>${invoice.invoice_number}</div>
      <div style="margin-top: 10px; color: #6b7280;">
        <div>Date: ${new Date(invoice.created_at).toLocaleDateString()}</div>
        <div>Period: ${new Date(invoice.start_date).toLocaleDateString()} - ${new Date(invoice.end_date).toLocaleDateString()}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill To:</div>
    <div style="font-size: 16px;">
      <div style="font-weight: 600;">${invoice.client_name}</div>
      <div style="color: #6b7280;">${invoice.client_email}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">From:</div>
    <div style="font-size: 16px;">
      <div style="font-weight: 600;">${userName}</div>
      <div style="color: #6b7280;">${userEmail}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th style="text-align: right;">Hours</th>
        <th style="text-align: right;">Rate</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      <tr class="total-row">
        <td colspan="2" style="padding: 16px;">TOTAL</td>
        <td style="padding: 16px; text-align: right;">${invoice.total_hours.toFixed(2)} hrs</td>
        <td style="padding: 16px;"></td>
        <td style="padding: 16px; text-align: right;">$${(invoice.total_amount || 0).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 40px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
    <div style="font-size: 14px; color: #6b7280;">
      <p><strong>Payment Terms:</strong> Net 30 days</p>
      <p><strong>Notes:</strong> ${invoice.notes || "Thank you for your business!"}</p>
    </div>
  </div>

  <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af;">
    <p>This is an electronically generated invoice.</p>
    <p>For questions, please contact: ${userEmail}</p>
  </div>
</body>
</html>
  `;
}

function generateEmailHtml(invoice: any, items: any[], userName: string, approveUrl: string, rejectUrl: string): string {
  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${new Date(item.task_date).toLocaleDateString()}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.task_description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.hours.toFixed(2)} hrs</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Invoice Received</h1>
      <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Invoice ${invoice.invoice_number}</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
        Hello,
      </p>
      <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
        ${userName} has submitted an invoice for services rendered during the period of 
        <strong>${new Date(invoice.start_date).toLocaleDateString()}</strong> to 
        <strong>${new Date(invoice.end_date).toLocaleDateString()}</strong>.
      </p>

      <!-- Invoice Summary -->
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h2 style="font-size: 18px; color: #1f2937; margin: 0 0 15px 0;">Invoice Summary</h2>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #6b7280;">Client:</span>
          <span style="color: #1f2937; font-weight: 600;">${invoice.client_name}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #6b7280;">Invoice Number:</span>
          <span style="color: #1f2937; font-weight: 600;">${invoice.invoice_number}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #6b7280;">Total Hours:</span>
          <span style="color: #1f2937; font-weight: 600;">${invoice.total_hours.toFixed(2)} hours</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #e5e7eb;">
          <span style="color: #1f2937; font-size: 18px; font-weight: 600;">Total Amount:</span>
          <span style="color: #2563eb; font-size: 20px; font-weight: 700;">$${(invoice.total_amount || 0).toFixed(2)}</span>
        </div>
      </div>

      <!-- Task Details -->
      <h3 style="font-size: 16px; color: #1f2937; margin: 30px 0 15px 0;">Work Completed:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; text-align: left; font-size: 14px; color: #6b7280;">Date</th>
            <th style="padding: 10px; text-align: left; font-size: 14px; color: #6b7280;">Task</th>
            <th style="padding: 10px; text-align: right; font-size: 14px; color: #6b7280;">Hours</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Approval Buttons -->
      <div style="text-align: center; margin: 40px 0;">
        <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
          Please review the attached PDF invoice and approve or reject:
        </p>
        <div style="margin: 20px 0;">
          <a href="${approveUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 0 10px;">
            ✓ Approve Invoice
          </a>
          <a href="${rejectUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 0 10px;">
            ✗ Reject Invoice
          </a>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 30px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Note:</strong> The complete invoice is attached as a PDF. Please review all details before approving.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        Questions? Contact ${userName} or reply to this email.
      </p>
      <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} Staffly. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

