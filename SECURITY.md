# SECURITY, AUTHENTICATION & MULTI-DEVICE ARCHITECTURE

Security architecture for the Hindu Subscription Portal managing sensitive subscriber PII (names, phone numbers, addresses, renewal dates).

---

## 1. Authentication & Session Architecture

1. **Invite-Only Closed System**:
   - Public signup is permanently disabled (`ENABLE_SIGNUP=false`).
   - Any currently signed-in verified administrator can invite or provision a colleague via their email with a temporary credential or invite link.
   - An active allowlist table (`user_profiles`) validates incoming authentication requests. Deactivated accounts are revoked immediately.

2. **Simultaneous Multi-Device Concurrency**:
   - The same account and multiple administrators can operate simultaneously across mobile phones (Android/iOS PWA) and desktop workstations.
   - Session tokens are stored in `httpOnly`, `SameSite=Lax`, `Secure` cookies with continuous refresh rotation.
   - Logging in on a new device **never terminates** sessions on other active devices.
   - An "Active Sessions & Devices" panel in Settings displays connected user agents and IP locations with an optional "Sign out all other devices" action.

3. **Data Protection & PII Safeguards**:
   - Subscriber phone numbers, addresses, and identity notes are classified as Confidential Customer Data.
   - All client-to-server and database communication is strictly enforced over TLS 1.3 / HTTPS.
   - Raw seed files and customer databases are excluded from public git repositories (`.gitignore` rules for PDF/XLSX/CSV data files).
   - Server logs never print plain-text phone numbers or full customer addresses.

---

## 2. Row Level Security (RLS) & Authorization

Every Postgres table in Supabase enforces strict Row Level Security (RLS):
```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Only authenticated users who are active in user_profiles can access data:
CREATE POLICY "Active users full access on customers"
  ON customers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_active = true));
```
Anonymous requests (`anon` key) have zero read or write permissions on subscriber records.

---

## 3. Realtime Synchronization & Concurrency Safety

1. **Supabase Realtime Broadcast**:
   - Subscriptions to `postgres_changes` on `customers`, `subscriptions`, and `notifications` notify active web clients within `< 80ms`.
   - Subtle toast: `"Record updated by Umapathy just now"`.

2. **Optimistic Concurrency Control (OCC)**:
   - Every customer and subscription row includes an integer `version` and `updated_at`.
   - Edits pass expected `version`. If another administrator saved a change in the interim, the transaction aborts with a `409 Conflict`, prompting the user to inspect changes and merge rather than silently overwriting.

3. **Immutable Audit Trail**:
   - Every write operation (Insert, Update, Delete, Renew, Note Added) logs `user_id`, `user_email`, `device_info`, `action`, `old_value`, and `new_value`.
   - Customer records use soft deletion (`deleted_at IS NOT NULL`) so no record is ever permanently lost accidentally.
