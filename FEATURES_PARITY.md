# FEATURES PARITY AUDIT & EXTENSION SPECIFICATION
**Reference Application:** `toi-admin-portal` (https://github.com/sudharson-u/toi-admin-portal / https://toi-admin-portal.vercel.app)
**New Application:** "Hindu" Multi-Newspaper Subscription Portal (4 Newspapers)
**Distribution Zone:** Royapuram, Chennai-600013 and nearby (New/Old Washermanpet)

---

## 1. Executive Summary & Core Extension

The reference system was built exclusively for **The Times of India (TOI)** with a 3-month notification window. The new **Hindu** platform retains **100% of the reference features, pages, API routes, data exports, PDF generators, and workflow ergonomics**, while architecturally generalizing the data model to manage **four publications simultaneously**:
1. **Dinakaran** (Tamil Daily)
2. **Dinamalar** (Tamil Daily)
3. **NIE / DIN** (The New Indian Express / Dinamani Joint Subscription)
4. **The Hindu** (National English Daily)

> **Key Rule**: The brand/app name is **Hindu** (in branding, headers, PWA title, manifest, and logos). Inside the UI and tables, the publication is always explicitly labeled **"The Hindu"** alongside **"Dinakaran"**, **"Dinamalar"**, and **"NIE / DIN"** to eliminate any ambiguity.

---

## 2. Feature Parity Matrix

| Reference Feature (`toi-admin-portal`) | Reference Behavior | Hindu Multi-Paper Implementation | Parity Status |
| :--- | :--- | :--- | :--- |
| **Authentication** | Supabase Auth + Demo session cookie fallback | Supabase Auth + secure session cookies + multi-device concurrency + invite-only system + demo fallback | **Enhanced** |
| **Multi-Device Concurrency** | Basic Supabase session | Simultaneous multi-device login without kicking existing sessions; Active sessions list with "Sign out other devices" | **Enhanced** |
| **Realtime Sync** | Supabase manual fetch | Supabase Realtime broadcast channels for live updates across devices without refresh; "Updated by..." toasts | **Enhanced** |
| **Optimistic Concurrency** | Basic last-write-wins | Concurrency versioning (`version` / `updated_at` check) with merge/overwrite conflict modal; soft deletes | **Enhanced** |
| **Global Newspaper Switcher** | Fixed single newspaper (TOI) | Global filter pill/switcher (`All`, `Dinakaran`, `Dinamalar`, `NIE / DIN`, `The Hindu`), remembered in user preferences | **Enhanced** |
| **Dashboard** | 6 KPI cards, upcoming renewals table, mobile cards | Multi-paper KPI cards (Totals, Active, Expiring, Expired, Renewed), donut distribution chart, monthly trend, filtered table | **Enhanced** |
| **Customers Directory** | Instant search, filters, pagination, sort, virtualized desktop table + mobile cards | Full text search, paper filter, status filter, area filter, type filter, column chooser, bulk actions, virtual table + cards | **Enhanced** |
| **Customer Dossier (`[id]`)** | Single paper details, contact, audit log, notes, share | Unified customer identity with all 4 paper subscriptions, timeline history, one-tap Tel/WhatsApp/SMS, notes, audit trail | **Enhanced** |
| **Add / Edit Customer** | Form with customer + single TOI subscription | Modal & page for customer + subscription picker across 4 papers, auto-calculation of 1-yr end date, phone duplicate warning | **Enhanced** |
| **Renewal Flow** | `RenewDialog` archives previous sub, creates new sub | One-tap renewal per paper with pre-filled WhatsApp/SMS English & Tamil reminders, date increment, undo toast | **Enhanced** |
| **Notification Engine** | Trigger on sub insert/update (3-month window) | **1-month window (30 days)**, tiered urgency (30–15d info, 14–7d warning, ≤6d urgent, expired critical); IST scheduler | **Deliberate Change (1 Month)** |
| **Notification Center** | In-app bell, unread count, mark read, dismiss, mark all | Multi-paper notification feed, paper filters, per-user read tracking, template action buttons, desktop push notification | **Enhanced** |
| **PDF Generation** | `generateCustomersPDF` (jsPDF + autoTable A4) | Branded A4 PDF generation with publication badges, Royapuram zone header, custom filters, Dossier PDF & Batch PDF | **Enhanced** |
| **Excel Export** | Customer list & full database XLSX | Filtered or full export with publication column, start/end dates, calculated flag, customer type, phone | **Enhanced** |
| **Import Wizard** | Preview & Import XLSX/CSV | Reusable wizard + one-time seed from 4 attached PDFs, deduplication by mobile first, review queue for suspicious dates | **Enhanced** |
| **Settings** | Theme toggle, DB info, schema reference | Configurable notification window (default 30d), message templates (EN/TA), user invite/management, PWA settings, i18n | **Enhanced** |
| **PWA / Offline** | Basic manifest + service worker | Serwist PWA, offline shell, cached customer directory, install prompt, maskable icons, standalone display | **Enhanced** |
| **Audit Log** | `audit_logs` table with user_id, customer_id, JSON diff | Full audit logging: actor, device, newspaper, action, before/after JSON diff, filterable log page | **Enhanced** |

---

## 3. Database Schema Parity & Expansion

### 3.1. Reference Tables (`toi-admin-portal`)
- `customers`
- `subscriptions`
- `notifications`
- `audit_logs`

### 3.2. Hindu Platform Tables
```sql
-- 1. Newspapers / Publications catalog
CREATE TABLE newspapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL CHECK (code IN ('DINAKARAN', 'DINAMALAR', 'NIE_DIN', 'THE_HINDU')),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  badge_bg TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Deduplicated Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT UNIQUE, -- e.g. HIN-0001 or legacy ID
  customer_name TEXT NOT NULL,
  mobile_number TEXT DEFAULT '', -- unique when present
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

-- 3. Subscriptions (Multi-Paper, Historical & Active)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notifications (Shared, 1-Month Window)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 5. User Notification Reads (Per-User Read State)
CREATE TABLE user_notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

-- 6. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 7. Notification Settings
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_days INT NOT NULL DEFAULT 30,
  whatsapp_template_en TEXT,
  whatsapp_template_ta TEXT,
  sms_template_en TEXT,
  sms_template_ta TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. User Profiles & Invite Allowlist
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Import Batches (for rollback support)
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  newspaper_id UUID REFERENCES newspapers(id),
  total_rows INT NOT NULL,
  imported_count INT NOT NULL,
  updated_count INT NOT NULL,
  skipped_count INT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Notification Window Calculation Rules

In `toi-admin-portal`:
- Notification date = `end_date - 3 months`
- Status `renew_soon` = 3 months before expiry

In **Hindu Multi-Paper Portal**:
- Notification window = **30 days (1 month)** default (customizable in Settings)
- Tiers:
  - **30 to 15 days left**: Info (Blue/Purple tint)
  - **14 to 7 days left**: Warning (Amber badge)
  - **6 to 1 days left**: Urgent (Orange/Rose pulse)
  - **Expired (≤ 0 days)**: Critical (Red badge)
- **Staff** and **Free Copy** subscriptions: Never trigger expiry notifications.
- **Dropped** subscriptions: Excluded from notifications and renewal lists.

---

## 5. UI/UX "Premium Purple" Design Tokens

- **Deep Violet / Charcoal**: `#1B0B3B` (Sidebar background, dark canvas)
- **Royal Purple**: `#5B21B6` (Primary header, PWA theme-color, bold badges)
- **Primary Violet**: `#7C3AED` (Primary action buttons, active states)
- **Soft Violet**: `#A78BFA` (Hover accents, borders, subtle highlights)
- **Lavender Mist**: `#EDE9FE` / `#F5F3FF` (Light mode backgrounds, subtle card fills)
- **Champagne Gold**: `#E9B949` (Tiny luxury highlight stars, VIP badges, high-priority icons)
- **Newspaper Harmonized Accent Monograms**:
  - Dinakaran: Ruby Rose tint `#E11D48` within violet shell `[DK]`
  - Dinamalar: Emerald Teal tint `#0D9488` within violet shell `[DM]`
  - NIE / DIN: Cobalt Indigo tint `#3B82F6` within violet shell `[ND]`
  - The Hindu: Imperial Purple tint `#7C3AED` with Champagne border `[TH]`

---

## 6. Verification and Acceptance Criteria
1. Every single file, endpoint, and script from `toi-admin-portal` has an equivalent in `Hindu`.
2. All 4 newspapers can be filtered individually or viewed together.
3. Seed data accurately captures all 4 PDF registers:
   - Dinakaran (5)
   - Dinamalar (21)
   - NIE / DIN (18)
   - The Hindu (35, with missing 17-18 flagged in Review Queue)
4. Full PDF, Excel, and Print exports function flawlessly.
5. PWA installable and offline-ready with the official Hindu logo.
