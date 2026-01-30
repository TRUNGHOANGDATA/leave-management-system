-- =============================================
-- CREATE EMAIL TEMPLATES TABLE (ROBUST VERSION)
-- Run this in Supabase SQL Editor
-- =============================================

-- 0. Enable UUID extension just in case
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Reset Table to ensure clean slate
DROP TABLE IF EXISTS public.email_templates;

-- 2. Create Table
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE, -- 'new_request', 'request_decision'
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    variables JSONB, -- List of available variables for hint
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Policy 1: Allow Admins/Directors to do EVERYTHING (Select, Insert, Update, Delete)
CREATE POLICY "Allow full access for managers" ON public.email_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('admin', 'director')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('admin', 'director')
  )
);

-- Policy 2: Allow Service Role (Edge Functions) to Read
CREATE POLICY "Service Role read" ON public.email_templates
FOR SELECT
TO service_role
USING (true);

-- Policy 3: Allow everyone to read (Temporary fallback if RLS is tricky, optional)
-- CREATE POLICY "Allow all read" ON public.email_templates FOR SELECT USING (true);


-- 5. Seed Default Templates (Insert Data)
INSERT INTO public.email_templates (slug, name, description, subject, body_html, variables)
VALUES 
(
    'new_request', 
    'Đơn xin nghỉ mới', 
    'Gửi cho quản lý khi có đơn mới',
    '[Leave App] Đơn xin nghỉ phép mới: {{requesterName}}',
    '<h2>📋 Đơn xin nghỉ phép mới</h2>
<p>Xin chào,</p>
<p><strong>{{requesterName}}</strong> vừa nộp đơn xin nghỉ phép:</p>
<table style="width:100%; max-width:600px; border-collapse: collapse; margin-bottom: 20px; background: #f9fafb; border-radius: 8px; overflow: hidden;">
  <tr style="border-bottom: 1px solid #eee;">
    <td style="padding: 12px 16px; color: #555; width: 140px;">📝 Loại nghỉ:</td>
    <td style="padding: 12px 16px; font-weight: bold; color: #111;">{{leaveType}}</td>
  </tr>
  <tr style="border-bottom: 1px solid #eee;">
    <td style="padding: 12px 16px; color: #555;">📅 Thời gian:</td>
    <td style="padding: 12px 16px; color: #111;">Từ <strong>{{fromDate}}</strong> đến <strong>{{toDate}}</strong></td>
  </tr>
  <tr style="border-bottom: 1px solid #eee;">
    <td style="padding: 12px 16px; color: #555;">💬 Lý do:</td>
    <td style="padding: 12px 16px; color: #111;">{{reason}}</td>
  </tr>
</table>

<div style="margin-top: 25px;">
  <a href="{{approveUrl}}" style="display: inline-block; padding: 14px 28px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    👉 Duyệt đơn ngay
  </a>
</div>
<p style="font-size:12px; color: #888; margin-top:20px;">Vui lòng không trả lời email này.</p>',
    '["requesterName", "leaveType", "fromDate", "toDate", "reason", "approveUrl"]'::jsonb
),
(
    'request_decision', 
    'Thông báo kết quả duyệt', 
    'Gửi cho nhân viên khi có kết quả',
    '[Leave App] Kết quả: Đơn nghỉ phép của bạn đã {{status}}',
    '<h2>🔔 Thông báo kết quả</h2>
<p>Xin chào <strong>{{requesterName}}</strong>,</p>
<p>Đơn xin nghỉ phép ({{fromDate}} - {{toDate}}) của bạn đã được quản lý <strong style="color: #333;">{{approverName}}</strong> xử lý.</p>

<div style="padding: 20px; border-radius: 8px; background-color: #f3f4f6; margin: 24px 0; text-align: center; border: 1px solid #e5e7eb;">
  <p style="margin: 0; font-size: 16px; color: #555;">Kết quả xét duyệt:</p>
  <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: 800; color: {{statusColor}};">
    {{status}}
  </p>
</div>

<p>Vui lòng <a href="{{approveUrl}}" style="color: #0070f3;">đăng nhập vào hệ thống</a> để xem chi tiết.</p>',
    '["requesterName", "status", "statusColor", "approverName", "fromDate", "toDate"]'::jsonb
);

-- 6. Verification: Return inserted rows to confirm
SELECT * FROM public.email_templates;
