-- Hindu Multi-Newspaper Subscription Portal - Database Schema
-- Run this in Supabase SQL Editor

-- 1. Enable UUID extension and Trigram extension for fast fuzzy search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Newspapers Catalog
CREATE TABLE IF NOT EXISTS newspapers (
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
INSERT INTO newspapers (code, name, short_name, language, accent_color, badge_bg, badge_text, display_order)
VALUES
  ('DINAKARAN', 'Dinakaran', 'DK', 'Tamil', '#E11D48', 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', 'text-rose-600', 1),
  ('DINAMALAR', 'Dinamalar', 'DM', 'Tamil', '#0D9488', 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800', 'text-teal-600', 2),
  ('NIE_DIN', 'NIE / DIN', 'ND', 'English / Tamil', '#3B82F6', 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', 'text-blue-600', 3),
  ('THE_HINDU', 'The Hindu', 'TH', 'English', '#7C3AED', 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', 'text-purple-600', 4)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, accent_color = EXCLUDED.accent_color,
    badge_bg = EXCLUDED.badge_bg, badge_text = EXCLUDED.badge_text, display_order = EXCLUDED.display_order;

-- 3. Deduplicated Customers
CREATE TABLE IF NOT EXISTS customers (
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

-- 4. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  newspaper_id UUID NOT NULL REFERENCES newspapers(id) ON DELETE RESTRICT,
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
  -- Notification trigger date = 30 days (1 month) before end date
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

-- 5. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
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

-- 6. User Notification Reads (Per-User Read State)
CREATE TABLE IF NOT EXISTS user_notification_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

-- 7. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_email TEXT,
  device_info TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. User Profiles & Invite Allowlist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  window_days INT NOT NULL DEFAULT 30,
  whatsapp_template_en TEXT DEFAULT 'Dear {{name}}, your subscription for {{newspaper}} is expiring on {{end_date}}. Please contact Umapathy at 9094013926 to renew seamlessly. Thank you!',
  whatsapp_template_ta TEXT DEFAULT 'அன்புள்ள {{name}}, தங்களின் {{newspaper}} சந்தா {{end_date}} அன்று முடிவடைகிறது. தடையின்றி புதுப்பிக்க உமாபதி (9094013926) அவர்களை தொடர்பு கொள்ளவும். நன்றி!',
  sms_template_en TEXT DEFAULT 'Hindu Portal: Dear {{name}}, {{newspaper}} renewal is due on {{end_date}}. Call 9094013926 for renewal.',
  sms_template_ta TEXT DEFAULT 'வணக்கம் {{name}}, தங்களின் {{newspaper}} நாளிதழ் சந்தா {{end_date}} அன்று முடிவடைகிறது. புதுப்பிக்க 9094013926.',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO notification_settings (window_days)
SELECT 30 WHERE NOT EXISTS (SELECT 1 FROM notification_settings);

-- 10. Import Batches
CREATE TABLE IF NOT EXISTS import_batches (
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

-- 11. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_newspaper ON subscriptions(newspaper_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_current ON subscriptions(is_current);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order_no ON subscriptions(order_no);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_customer ON audit_logs(customer_id);

-- GIN trigram index for blazing-fast instant search across names, phones, addresses and orders
CREATE INDEX IF NOT EXISTS idx_customers_trgm_search ON customers
  USING gin((customer_name || ' ' || COALESCE(mobile_number, '') || ' ' || COALESCE(address, '') || ' ' || COALESCE(customer_code, '')) gin_trgm_ops);

-- 12. Helper Functions & Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: create 30-day renewal notification
CREATE OR REPLACE FUNCTION create_renewal_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notifications for active, non-staff, non-free current subscriptions with valid end dates
  IF NEW.is_current = true AND NEW.status NOT IN ('Staff', 'Free', 'Dropped') AND NEW.end_date IS NOT NULL THEN
    -- Delete previous pending notification for this subscription
    DELETE FROM notifications 
    WHERE subscription_id = NEW.id AND status = 'pending';

    -- Tier determination based on days left
    INSERT INTO notifications (
      customer_id,
      subscription_id,
      notification_type,
      urgency_tier,
      scheduled_date,
      status
    ) VALUES (
      NEW.customer_id,
      NEW.id,
      'renewal_reminder',
      CASE 
        WHEN (NEW.end_date - CURRENT_DATE) <= 0 THEN 'critical'
        WHEN (NEW.end_date - CURRENT_DATE) <= 6 THEN 'urgent'
        WHEN (NEW.end_date - CURRENT_DATE) <= 14 THEN 'warning'
        ELSE 'info'
      END,
      NEW.notification_date,
      'pending'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_renewal_notification_trigger
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION create_renewal_notification();

-- 13. Row Level Security
ALTER TABLE newspapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full operational access
CREATE POLICY "Auth users can access newspapers" ON newspapers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access subscriptions" ON subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access notifications" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access user_notification_reads" ON user_notification_reads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access audit_logs" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access user_profiles" ON user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access notification_settings" ON notification_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can access import_batches" ON import_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
