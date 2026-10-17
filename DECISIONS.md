# ARCHITECTURAL DECISIONS RECORD (DECISIONS.md)

### ADR 001: Brand Name vs Publication Label
- **Context**: The brand name of the portal is "Hindu", while one of the four managed newspapers is "The Hindu".
- **Decision**: The overall application, PWA manifest, document title, and navbar brand is named **"Hindu"**. Inside tables, subscription badges, filters, and reports, the publication is strictly labeled **"The Hindu"** alongside **"Dinakaran"**, **"Dinamalar"**, and **"NIE / DIN"**. This eliminates any ambiguity for staff.

### ADR 002: Expiry & Renewal Window
- **Context**: The reference `toi-admin-portal` used a 3-month window.
- **Decision**: The renewal notification window is deliberately configured to **1 month (30 days)**, as specified.
- **Tiers**:
  - `30 to 15 days`: Info (Upcoming notice)
  - `14 to 7 days`: Warning (Active follow-up)
  - `≤ 6 days`: Urgent (Critical reminder)
  - `≤ 0 days`: Expired (Requires immediate renewal or drop status)

### ADR 003: Single Permission Level (Invite-Only)
- **Context**: Access is restricted to trusted circulation personnel and administrators.
- **Decision**: There are no tiered roles (e.g. read-only viewers). Every authenticated, active user has equal access to read, create, update, renew, export, and invite other administrators. Registration without invitation is blocked.

### ADR 004: Deduplication by Mobile Number
- **Context**: Several customers subscribe to 2 or 3 newspapers simultaneously.
- **Decision**: The `customers` table represents unique individuals identified by normalized 10-digit mobile phone numbers. The `subscriptions` table contains 1..N records linked by foreign key `customer_id` and `newspaper_id`.

### ADR 005: Handling Irregular and Blurred Source Data
- **Missing End Dates**: Standardized to `start_date + 1 year - 1 day` and marked `is_end_date_calculated = true`.
- **Vague Dates ("June 2026")**: Normalized to `01/06/2026` with `needs_review = true` and surfaced in the Review Queue.
- **Staff / Free Copy Records**: Marked with explicit status `Staff` or `Free Copy`. They do not have required end dates and are permanently excluded from expiry alerts.
- **The Hindu Omitted Records (S.No 17 & 18)**: Handled gracefully by placing an actionable task in the Review Queue for manual record entry upon receipt of physical index cards.
