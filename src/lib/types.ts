export type NewspaperCode = 'DINAKARAN' | 'DINAMALAR' | 'NIE_DIN' | 'THE_HINDU';

export type SubscriptionStatus = 'Active' | 'Expiring' | 'Expired' | 'Dropped' | 'Free' | 'Staff' | 'Renewed';

export type CustomerType = 'Regular' | 'Staff' | 'Free Copy' | 'Business/Institution';

export type NotificationStatus = 'pending' | 'notified' | 'dismissed' | 'renewed';

export type UrgencyTier = 'info' | 'warning' | 'urgent' | 'critical';

export interface Newspaper {
  id?: string;
  code: NewspaperCode;
  name: string;
  short_name?: string;
  language?: string;
  accent_color?: string;
  badge_bg?: string;
  badge_text?: string;
  active?: boolean;
  display_order?: number;
}

export interface Subscription {
  id: string;
  customer_id: string;
  newspaper_id: string;
  newspaper?: Newspaper;
  order_no?: string;
  start_date?: string | null;
  end_date?: string | null;
  duration_months?: number;
  status: SubscriptionStatus;
  is_current: boolean;
  is_end_date_calculated?: boolean;
  needs_review?: boolean;
  review_reason?: string;
  remarks?: string;
  notification_date?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  customer_code?: string;
  customer_name: string;
  mobile_number: string;
  email?: string;
  address: string;
  street_area?: string;
  pincode?: string;
  customer_type: CustomerType;
  notes?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // joined subscriptions
  subscriptions?: Subscription[];
}

export interface CustomerWithStats extends Customer {
  active_subscriptions_count: number;
  expiring_subscriptions_count: number;
  newspapers_list: NewspaperCode[];
  primary_status: SubscriptionStatus;
  days_remaining_min: number | null;
}

export interface Notification {
  id: string;
  customer_id: string;
  subscription_id: string;
  notification_type: 'renewal_reminder' | 'urgent_reminder' | 'expired' | 'renewed';
  urgency_tier: UrgencyTier;
  scheduled_date: string;
  sent_at?: string | null;
  status: NotificationStatus;
  read_at?: string | null;
  created_at: string;
  // joined
  customer?: Customer;
  subscription?: Subscription;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  device_info?: string;
  customer_id?: string;
  subscription_id?: string;
  action: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at: string;
}

export interface ReviewQueueItem {
  id: string;
  newspaper: NewspaperCode | string;
  type: string;
  severity: 'info' | 'warning' | 'medium' | 'urgent';
  customer_name?: string;
  mobile?: string;
  description: string;
  action_required?: string;
  subscription?: {
    newspaper?: string | Newspaper;
    order_no?: string;
    start_date?: string | null;
    end_date?: string | null;
    is_end_date_calculated?: boolean;
    status?: SubscriptionStatus | string;
    needs_review?: boolean;
    review_reason?: string;
    raw_s_no?: number;
  };
}

export interface DashboardStats {
  total_customers: number;
  total_subscriptions: number;
  active_subscriptions: number;
  expiring_in_30_days: number;
  expiring_urgent_7_days: number;
  already_expired: number;
  staff_free_copies: number;
  paper_counts: Record<NewspaperCode, number>;
  paper_expiring: Record<NewspaperCode, number>;
}

export interface NotificationSettings {
  id: string;
  window_days: number;
  whatsapp_template_en: string;
  whatsapp_template_ta: string;
  sms_template_en: string;
  sms_template_ta: string;
  updated_at: string;
}

export interface ImportPreviewRow {
  row: number;
  newspaper: NewspaperCode;
  customer_name: string;
  mobile_number: string;
  address: string;
  order_no?: string;
  start_date?: string | null;
  end_date?: string | null;
  customer_type: CustomerType;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; field: string; message: string }[];
}

export interface ReportFilter {
  month: number;
  year: number;
  newspaper?: NewspaperCode | 'ALL';
  report_type: 'ending' | 'starting' | 'active' | 'renewed' | 'all';
}
