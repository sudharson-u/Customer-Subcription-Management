# Hindu — Newspaper Subscription & Circulation Portal (PWA)

A production-grade, installable Web App (PWA) designed to manage customer subscriptions for **FOUR newspapers** in one place:
1. **Dinakaran** (தினகரன்)
2. **Dinamalar** (தினமலர்)
3. **NIE / DIN** (The New Indian Express / தினமணி)
4. **The Hindu**

> **Branding vs Publication Label Rule:**
> The brand, website, title, and PWA name is strictly **"Hindu"**. Inside all tables, forms, filters, and records, the publication is strictly labeled **"The Hindu"** alongside "Dinakaran", "Dinamalar", and "NIE / DIN" to ensure zero ambiguity.

**Primary Circulation Beat:** Royapuram, Chennai - 600013 and neighboring areas (New Washermanpet, Old Washermanpet).  
**Lead Administrator:** Umapathy (Circulation Agency)

---

## 🌟 Key Features & 100% Reference Parity

Built with 100% feature parity to the reference `toi-admin-portal`, extended natively from 1 newspaper to **4 concurrent newspapers**:

1. **Dashboard & Metrics:**
   - Real-time animated counters for total customers, active subscriptions, renewals due, and copies per newspaper.
   - Per-publication distribution donuts, monthly expiry pipeline, and quick renewal shortcuts.
2. **Global Publication Switcher:**
   - One-tap pills (All | Dinakaran | Dinamalar | NIE / DIN | The Hindu) persisted in user state.
3. **Unified Customer Directory:**
   - Instant search across subscriber name, 10-digit mobile, address, order number, and street.
   - Filter by status, area, customer classification (Regular, Staff, Free Copy, Business/Institution).
   - Multi-select bulk actions (Bulk Export PDF, WhatsApp alerts, CSV download).
4. **Single-Subscriber Dossier:**
   - Displays all subscriptions held by a customer across all 4 publications on a single screen.
   - One-tap direct **Call (`tel:`)**, **WhatsApp (`wa.me`)** prefilled renewal notice, and **SMS**.
   - Immutable delivery notes, gate landmarks, and subscriber history timeline.
5. **Renewals & Expiry Hub (Strict 1-Month / 30-Day Window):**
   - **Deliberate Enhancement:** Expiry alert window is set to **30 days (1 Month)** (configurable in Settings), compared to the reference app's 3 months.
   - Automated Urgency Tiers:
     - **30–15 Days:** Information Notice (Amber/Blue)
     - **14–7 Days:** Warning Notice (Amber)
     - **≤ 6 Days:** Critical Urgent Notice (Rose)
     - **Expired:** Service Interruption Alert (Red)
   - One-Tap **Renew Dialog** with duration picker (1, 3, 6, 12 months) and automatic end-date recalculation (+1 year minus 1 day).
6. **Data Integrity & Review Queue:**
   - Dedicated resolution screen for anomalies identified in the source physical registers:
     - Missing S.No 17 & 18 in The Hindu register.
     - 9-digit incomplete phone numbers (e.g. Navaneetha Krishnan).
     - Suspicious leap-year dates (e.g. Jiya Sudeen).
     - Vague commence dates ("June 2026").
7. **Official Reports & Export Intelligence:**
   - Instant PDF Generation with official Deep Violet header, custom title, and Royapuram circulation footer.
   - Daily morning delivery beat sheets sorted by street.
   - Multi-paper subscriber rosters (13 multi-paper subscribers deduplicated).
   - Master Excel export (`.xlsx`) with separate sheets per publication.
8. **Reusable Import Wizard & Backup Engine:**
   - Drag-and-drop CSV / Excel spreadsheet ingestion with live row validation, duplicate detection, and batch rollback.
   - Full cold-storage JSON database dump and snapshot exports.
9. **Invite-Only Access & Multi-Device Concurrency:**
   - Single permission level: every authenticated user has full administrative rights.
   - Public signup is permanently disabled; user addition is invite-only.
   - Multi-device simultaneous login from smartphones, tablets, and desktops with active session monitoring and "Sign out other devices" capability.
10. **Installable PWA (Progressive Web App):**
    - Service Worker caching via Serwist for instant offline access to subscriber records.
    - Official brand icon set (192px, 512px, maskable, apple-touch-icon, favicon).
    - Web Push notification toggle for daily renewal broadcasts.

---

## 🎨 UI/UX Design System: "Premium Purple"

Harmonized with the official brand logo extracted from `Logo.pdf`:
- **Deep Violet:** `#1B0B3B` (Sidebar, hero cards, dark canvas)
- **Royal Purple:** `#5B21B6` (Brand accents, PWA theme color)
- **Primary Violet:** `#7C3AED` (Interactive buttons, links, active states)
- **Soft Violet:** `#A78BFA` / **Lavender:** `#EDE9FE`
- **Champagne Gold:** `#E9B949` (Subtle premium badges & borders)
- **Typography:** Plus Jakarta Sans (Headings), Inter (UI & Data), Noto Sans Tamil (Tamil text).
- **Standards:** 8-pt grid, WCAG AA compliance, light and deep dark mode.

---

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **Language:** TypeScript 5.7 (Strict mode)
- **Styling:** Tailwind CSS v4, Lucide Icons, Radix UI primitives
- **Database & Auth:** Supabase (Postgres, Row Level Security, Realtime, Triggers)
- **Offline / Zero-Config Fallback:** Seamless in-memory store (`mockData.ts`) when Supabase is not connected.
- **Data Tables & Queries:** TanStack Table, TanStack Query
- **Reports:** jsPDF + autotable (Custom Deep Violet A4 layout)
- **PWA:** Web App Manifest, Service Worker (`sw.js`), Offline Shell (`offline.html`)
- **Testing:** Vitest for domain calculations, leap years, and phone sanitization

---

## 🚀 Quick Start & Development

### 1. Clone & Install
```bash
git clone <repo-url>
cd Customer_Data_Management
npm install
```

### 2. Environment Setup (Optional)
If connecting to Cloud Supabase, copy the environment file:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
*(If no credentials are provided, the application runs automatically in High-Fidelity Demo/Offline Mode with all 58 deduplicated subscribers preloaded.)*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Unit Tests
```bash
npm test
```

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## 🗄 Database Seeding & Schema

1. Apply the complete schema in `supabase/schema.sql` via the Supabase SQL Editor.
2. Run the automated seed script to populate newspapers and customer dossiers:
```bash
npm run seed
```

---

## ☁️ Vercel Deployment

1. Push your repository to GitHub.
2. Import the project into **Vercel**.
3. In **Settings -> General -> Function Region**, select **`bom1` (Mumbai, India)** for lowest latency to Chennai subscribers.
4. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
5. Deploy!

---

## 📄 Documentation Directory

- [FEATURES_PARITY.md](file:///d:/Customer_Data_Management/FEATURES_PARITY.md): Line-by-line audit against `toi-admin-portal`
- [DATA_IMPORT.md](file:///d:/Customer_Data_Management/DATA_IMPORT.md): Parsing rules and 58 deduplicated customer records from the 4 PDFs
- [DESIGN_SYSTEM.md](file:///d:/Customer_Data_Management/DESIGN_SYSTEM.md): Premium Purple design tokens and responsive specifications
- [SECURITY.md](file:///d:/Customer_Data_Management/SECURITY.md): Multi-device concurrency, invite-only auth, and OCC versioning
- [DECISIONS.md](file:///d:/Customer_Data_Management/DECISIONS.md): Architectural decisions and 30-day window rationale

---

*Designed & engineered for Umapathy Circulation Agency, Royapuram, Chennai-13.*
