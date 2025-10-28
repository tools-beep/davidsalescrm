import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://app.stafflyhq.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // 'approve' or 'reject'
    const invoiceId = url.searchParams.get("id");
    const email = url.searchParams.get("email");

    if (!action || !invoiceId || !email) {
      throw new Error("Missing required parameters");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, user_profiles!invoices_user_id_fkey(first_name, last_name, email)")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    // Check if already processed
    if (invoice.status !== "pending") {
      return new Response(
        generateHtmlResponse(
          "Invoice Already Processed",
          `This invoice has already been ${invoice.status}.`,
          "warning"
        ),
        {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
          status: 200,
        }
      );
    }

    if (action === "approve") {
      // Approve the invoice
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by_email: email,
        })
        .eq("id", invoiceId);

      if (updateError) {
        throw new Error(`Failed to approve invoice: ${updateError.message}`);
      }

      return new Response(
        generateHtmlResponse(
          "Invoice Approved ✓",
          `Invoice ${invoice.invoice_number} has been successfully approved. The team has been notified.`,
          "success"
        ),
        {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
          status: 200,
        }
      );
    } else if (action === "reject") {
      // Reject the invoice
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "rejected",
          approved_by_email: email, // Store who rejected it
        })
        .eq("id", invoiceId);

      if (updateError) {
        throw new Error(`Failed to reject invoice: ${updateError.message}`);
      }

      return new Response(
        generateHtmlResponse(
          "Invoice Rejected",
          `Invoice ${invoice.invoice_number} has been rejected. The team has been notified and will follow up with you.`,
          "error"
        ),
        {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
          status: 200,
        }
      );
    } else {
      throw new Error("Invalid action");
    }
  } catch (error) {
    console.error("Error processing invoice webhook:", error);
    return new Response(
      generateHtmlResponse(
        "Error",
        `An error occurred: ${error.message}`,
        "error"
      ),
      {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
        status: 500,
      }
    );
  }
});

function generateHtmlResponse(title: string, message: string, type: "success" | "error" | "warning"): string {
  const colors = {
    success: { bg: "#10b981", icon: "✓" },
    error: { bg: "#ef4444", icon: "✗" },
    warning: { bg: "#f59e0b", icon: "⚠" },
  };

  const color = colors[type];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 60px 40px;
      text-align: center;
      max-width: 500px;
      margin: 20px;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: ${color.bg};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
      font-size: 40px;
      color: white;
      font-weight: bold;
    }
    h1 {
      font-size: 28px;
      color: #1f2937;
      margin: 0 0 20px 0;
    }
    p {
      font-size: 16px;
      color: #6b7280;
      line-height: 1.6;
      margin: 0 0 30px 0;
    }
    .button {
      display: inline-block;
      background: ${color.bg};
      color: white;
      padding: 12px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: opacity 0.2s;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${color.icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${APP_URL}" class="button">Go to Dashboard</a>
    <div class="footer">
      You can safely close this window.
    </div>
  </div>
</body>
</html>
  `;
}

