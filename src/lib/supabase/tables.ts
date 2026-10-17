/**
 * Centralized Supabase table names.
 * When sharing the database with 'toi-admin-portal', tables are prefixed with 'hindu_'
 * so that the 290 TOI customer records are never touched or mixed.
 */
export const TABLES = {
  CUSTOMERS: process.env.NEXT_PUBLIC_SUPABASE_CUSTOMERS_TABLE || process.env.SUPABASE_CUSTOMERS_TABLE || 'hindu_customers',
  SUBSCRIPTIONS: process.env.NEXT_PUBLIC_SUPABASE_SUBSCRIPTIONS_TABLE || process.env.SUPABASE_SUBSCRIPTIONS_TABLE || 'hindu_subscriptions',
  NEWSPAPERS: process.env.NEXT_PUBLIC_SUPABASE_NEWSPAPERS_TABLE || process.env.SUPABASE_NEWSPAPERS_TABLE || 'hindu_newspapers',
  NOTIFICATIONS: process.env.NEXT_PUBLIC_SUPABASE_NOTIFICATIONS_TABLE || process.env.SUPABASE_NOTIFICATIONS_TABLE || 'hindu_notifications',
  AUDIT_LOGS: process.env.NEXT_PUBLIC_SUPABASE_AUDIT_LOGS_TABLE || process.env.SUPABASE_AUDIT_LOGS_TABLE || 'hindu_audit_logs',
  IMPORT_BATCHES: process.env.NEXT_PUBLIC_SUPABASE_IMPORT_BATCHES_TABLE || process.env.SUPABASE_IMPORT_BATCHES_TABLE || 'hindu_import_batches',
  NOTIFICATION_SETTINGS: process.env.NEXT_PUBLIC_SUPABASE_SETTINGS_TABLE || process.env.SUPABASE_SETTINGS_TABLE || 'hindu_notification_settings',
} as const;
