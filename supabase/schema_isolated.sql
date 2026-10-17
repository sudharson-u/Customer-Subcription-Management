-- ============================================================================
-- HINDU MULTI-NEWSPAPER SUBSCRIPTION PORTAL — ISOLATED SCHEMA
-- ============================================================================
-- This script creates dedicated 'hindu_*' tables allowing this application to
-- safely share the same Supabase project with 'toi-admin-portal' without
-- conflicting with or touching any of your 290 existing TOI customer records.
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/hkmckranacbsqtlouwir
-- 2. Click "SQL Editor" in the left navigation.
-- 3. Click "New query", paste this entire script, and click "Run".
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Hindu Newspapers Catalog
CREATE TABLE IF NOT EXISTS hindu_newspapers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL CHECK (code IN ('DINAKARAN', 'DINAMALAR', 'NIE_DIN', 'THE_HINDU')),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'Tamil',
  accent_color TEXT NOT NULL,
  badge_bg TEXT NOT NULL,
  badge_text TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Newspapers
INSERT INTO hindu_newspapers (code, name, short_name, language, accent_color, badge_bg, badge_text, display_order)
VALUES
  ('DINAKARAN', 'Dinakaran', 'DK', 'Tamil', '#E11D48', 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', 'text-rose-600', 1),
  ('DINAMALAR', 'Dinamalar', 'DM', 'Tamil', '#0D9488', 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800', 'text-teal-600', 2),
  ('NIE_DIN', 'NIE / DIN', 'ND', 'English / Tamil', '#3B82F6', 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', 'text-blue-600', 3),
  ('THE_HINDU', 'The Hindu', 'TH', 'English', '#7C3AED', 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', 'text-purple-600', 4)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, accent_color = EXCLUDED.accent_color,
    badge_bg = EXCLUDED.badge_bg, badge_text = EXCLUDED.badge_text, display_order = EXCLUDED.display_order;

-- 3. Deduplicated Hindu Customers
CREATE TABLE IF NOT EXISTS hindu_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_code TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  mobile_number TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  street_area TEXT DEFAULT 'Royapuram',
  pincode TEXT DEFAULT '600013',
  customer_type TEXT NOT NULL DEFAULT 'Regular'
    CHECK (customer_type IN ('Regular', 'Staff', 'Free Copy', 'Business/Institution')),
  notes TEXT DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Hindu Subscriptions
CREATE TABLE IF NOT EXISTS hindu_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES hindu_customers(id) ON DELETE CASCADE,
  newspaper_id UUID NOT NULL REFERENCES hindu_newspapers(id) ON DELETE RESTRICT,
  order_no TEXT DEFAULT '',
  start_date DATE,
  end_date DATE,
  duration_months INT DEFAULT 12,
  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Expiring', 'Expired', 'Dropped', 'Free', 'Staff')),
  is_current BOOLEAN NOT NULL DEFAULT true,
  is_end_date_calculated BOOLEAN NOT NULL DEFAULT false,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  review_reason TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  notification_date DATE GENERATED ALWAYS AS (
    CASE 
      WHEN end_date IS NOT NULL THEN (end_date - INTERVAL '30 days')::DATE
      ELSE NULL
    END
  ) STORED,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Hindu Notifications
CREATE TABLE IF NOT EXISTS hindu_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES hindu_customers(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES hindu_subscriptions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'renewal_reminder'
    CHECK (notification_type IN ('renewal_reminder', 'urgent_reminder', 'expired', 'renewed')),
  urgency_tier TEXT NOT NULL DEFAULT 'info'
    CHECK (urgency_tier IN ('info', 'warning', 'urgent', 'critical')),
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'dismissed', 'renewed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. User Notification Reads
CREATE TABLE IF NOT EXISTS hindu_user_notification_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL REFERENCES hindu_notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

-- 7. Hindu Audit Logs
CREATE TABLE IF NOT EXISTS hindu_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_email TEXT,
  device_info TEXT,
  customer_id UUID REFERENCES hindu_customers(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES hindu_subscriptions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Hindu Notification Settings
CREATE TABLE IF NOT EXISTS hindu_notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  window_days INT NOT NULL DEFAULT 30,
  whatsapp_template_en TEXT DEFAULT 'Dear {{name}}, your subscription for {{newspaper}} is expiring on {{end_date}}. Please contact Umapathy at 9094013926 to renew seamlessly. Thank you!',
  whatsapp_template_ta TEXT DEFAULT 'அன்புள்ள {{name}}, தங்களின் {{newspaper}} சந்தா {{end_date}} அன்று முடிவடைகிறது. தடையின்றி புதுப்பிக்க உமாபதி (9094013926) அவர்களை தொடர்பு கொள்ளவும். நன்றி!',
  sms_template_en TEXT DEFAULT 'Hindu Portal: Dear {{name}}, {{newspaper}} renewal is due on {{end_date}}. Call 9094013926 for renewal.',
  sms_template_ta TEXT DEFAULT 'வணக்கம் {{name}}, தங்களின் {{newspaper}} நாளிதழ் சந்தா {{end_date}} அன்று முடிவடைகிறது. புதுப்பிக்க 9094013926.',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO hindu_notification_settings (window_days)
SELECT 30 WHERE NOT EXISTS (SELECT 1 FROM hindu_notification_settings);

-- 9. Hindu Import Batches
CREATE TABLE IF NOT EXISTS hindu_import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  newspaper_code TEXT,
  total_rows INT NOT NULL DEFAULT 0,
  imported_count INT NOT NULL DEFAULT 0,
  updated_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_hindu_customers_code ON hindu_customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_hindu_customers_mobile ON hindu_customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_hindu_customers_name ON hindu_customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_hindu_customers_deleted ON hindu_customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_hindu_subscriptions_customer ON hindu_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_hindu_subscriptions_newspaper ON hindu_subscriptions(newspaper_id);
CREATE INDEX IF NOT EXISTS idx_hindu_subscriptions_status ON hindu_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_hindu_subscriptions_end_date ON hindu_subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_hindu_subscriptions_is_current ON hindu_subscriptions(is_current);
CREATE INDEX IF NOT EXISTS idx_hindu_subscriptions_order_no ON hindu_subscriptions(order_no);
CREATE INDEX IF NOT EXISTS idx_hindu_notifications_scheduled ON hindu_notifications(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_hindu_notifications_status ON hindu_notifications(status);
CREATE INDEX IF NOT EXISTS idx_hindu_audit_logs_customer ON hindu_audit_logs(customer_id);

CREATE INDEX IF NOT EXISTS idx_hindu_customers_trgm_search ON hindu_customers
  USING gin((customer_name || ' ' || COALESCE(mobile_number, '') || ' ' || COALESCE(address, '') || ' ' || COALESCE(customer_code, '')) gin_trgm_ops);

-- 11. Triggers
CREATE OR REPLACE FUNCTION update_hindu_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hindu_customers_updated_at ON hindu_customers;
CREATE TRIGGER trg_hindu_customers_updated_at
  BEFORE UPDATE ON hindu_customers
  FOR EACH ROW EXECUTE FUNCTION update_hindu_updated_at();

DROP TRIGGER IF EXISTS trg_hindu_subscriptions_updated_at ON hindu_subscriptions;
CREATE TRIGGER trg_hindu_subscriptions_updated_at
  BEFORE UPDATE ON hindu_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_hindu_updated_at();

-- 12. Row Level Security & Policies
ALTER TABLE hindu_newspapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hindu_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hindu_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hindu_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hindu_user_notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE hindu_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hindu_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hindu_import_batches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full operational access
CREATE POLICY "Auth users can access hindu_newspapers" ON hindu_newspapers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access hindu_customers" ON hindu_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access hindu_subscriptions" ON hindu_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access hindu_notifications" ON hindu_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access hindu_user_notification_reads" ON hindu_user_notification_reads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access hindu_audit_logs" ON hindu_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access hindu_notification_settings" ON hindu_notification_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access hindu_import_batches" ON hindu_import_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public read for anon key during local dev / test
CREATE POLICY "Anon read hindu_newspapers" ON hindu_newspapers FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read hindu_customers" ON hindu_customers FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read hindu_subscriptions" ON hindu_subscriptions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read hindu_notifications" ON hindu_notifications FOR SELECT TO anon USING (true);

-- 13. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE hindu_customers;
ALTER PUBLICATION supabase_realtime ADD TABLE hindu_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE hindu_notifications;
