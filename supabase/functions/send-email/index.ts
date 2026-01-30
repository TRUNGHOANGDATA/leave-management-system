import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

// SMTP Config (Hardcoded for deployment simplicity, ideal is env vars)
// User provided: trung.h@erx.vn / wiay yaim jcgv gsug
const SMTP_CONFIG = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "trung.h@erx.vn",
    pass: "wiayyaimjcgvgsug",
  },
};

const transporter = nodemailer.createTransport(SMTP_CONFIG);

interface EmailRequest {
  type: "new_request" | "request_decision";
  to: string;
  data: any;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: Replace handlebars-style variables {{key}}
function replaceVariables(template: string, data: any): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    console.log("Received payload:", JSON.stringify(rawBody));

    const { type, to, data } = rawBody as EmailRequest;

    // Initialize Supabase Client to fetch templates
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    let subject = "";
    let bodyContent = "";

    // 1. Try to fetch template from DB
    const { data: templateData, error } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .eq("slug", type)
      .single();

    // Normalize status for 'request_decision' emails
    let enrichedData = { ...data };
    if (type === "request_decision") {
      const rawStatus = (data.status || "").toLowerCase();
      const isApproved = rawStatus === "approved" || rawStatus === "đã duyệt" || rawStatus === "duyệt";
      enrichedData = {
        ...data,
        status: isApproved ? "ĐÃ DUYỆT (APPROVED)" : "TỪ CHỐI (REJECTED)",
        statusText: isApproved ? "ĐƯỢC DUYỆT" : "BỊ TỪ CHỐI",
        statusBadge: isApproved ? "ĐÃ DUYỆT" : "TỪ CHỐI",
        statusStyle: isApproved ? "color: #16a34a; font-weight: bold;" : "color: #dc2626; font-weight: bold;",
      };
      console.log("[Email] Status normalized:", { rawStatus, isApproved, displayStatus: enrichedData.status });
    }

    if (templateData && !error) {
      console.log(`Using DB template for: ${type}`);
      subject = replaceVariables(templateData.subject, enrichedData);
      bodyContent = replaceVariables(templateData.body_html, enrichedData);
    } else {
      console.warn(`Template not found for ${type}, utilizing fallback. Error:`, error);
      // FALLBACK (Hardcoded) if DB fetch fails or no template exists
      if (type === "new_request") {
        subject = `[Leave App] Đơn xin nghỉ phép mới từ ${data.requesterName}`;
        bodyContent = `
                  <h2>📋 Đơn xin nghỉ phép mới</h2>
                  <p>Xin chào quản lý,</p>
                  <p><strong>${data.requesterName}</strong> vừa nộp đơn xin nghỉ phép:</p>
                  <ul>
                    <li>Loại nghỉ: ${data.leaveType}</li>
                    <li>Thời gian: ${data.fromDate} - ${data.toDate}</li>
                    <li>Lý do: ${data.reason}</li>
                  </ul>
                  <a href="${data.approveUrl}" style="display:inline-block;padding:10px 20px;background:#0070f3;color:white;text-decoration:none;border-radius:5px;">Duyệt đơn ngay</a>
                `;
      } else if (type === "request_decision") {
        const isApproved = data.status === "approved" || data.status === "Đã duyệt";
        subject = `[Leave App] Kết quả: Đơn nghỉ phép ${isApproved ? 'được duyệt' : 'bị từ chối'}`;
        bodyContent = `
                  <h2>🔔 Thông báo kết quả</h2>
                  <p>Xin chào ${data.requesterName},</p>
                  <p>Đơn xin nghỉ phép của bạn đã: <strong>${isApproved ? 'ĐƯỢC DUYỆT' : 'BỊ TỪ CHỐI'}</strong></p>
                  <p>Người duyệt: ${data.approverName}</p>
                `;
      }
    }

    // Common HTML wrapper
    const wrapHtml = (content: string) => `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Roboto', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          ${content}
          <div style="margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 20px; font-size: 12px; color: #888;">
            <p>Hệ thống Quản lý Nghỉ phép</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`Sending email to: ${to}`);

    const info = await transporter.sendMail({
      from: `"HR System" <${SMTP_CONFIG.auth.user}>`,
      to: to,
      subject: subject,
      html: wrapHtml(bodyContent),
    });

    console.log("Message sent: %s", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Internal Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
