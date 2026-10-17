# HINDU DESIGN SYSTEM — "PREMIUM PURPLE"

A refined, high-performance design language engineered for mission-critical subscription operations. Inspired by Stripe, Linear, and Notion with custom adaptations for regional newspaper circulation.

---

## 1. Color Palette Tokens & Accessibility (WCAG AA Compliant)

### 1.1. Core Brand Colors
| Token Name | Hex Code | HSL Value | Usage |
| :--- | :--- | :--- | :--- |
| **Deep Violet** (`--canvas-dark`) | `#1B0B3B` | `261° 68% 14%` | Sidebar background, dark mode surface, high-contrast text |
| **Royal Purple** (`--brand-primary`) | `#5B21B6` | `263° 69% 42%` | Brand identity, primary headers, PWA theme-color |
| **Primary Violet** (`--action-primary`)| `#7C3AED` | `262° 83% 58%` | Primary buttons, active navigation, interactive highlights |
| **Soft Violet** (`--accent-soft`) | `#A78BFA` | `255° 92% 76%` | Secondary focus rings, subtle borders, muted badges |
| **Lavender** (`--surface-tint`) | `#EDE9FE` | `250° 92% 96%` | Light mode card tint, subtle table zebra stripes |
| **Mist Canvas** (`--canvas-light`) | `#F5F3FF` | `252° 100% 98%`| Primary page background in light mode |
| **Champagne Gold** (`--accent-gold`)| `#E9B949` | `42° 78% 60%` | Premium micro-highlights, VIP badges, high-priority indicators |

### 1.2. Publication Color Accents & Monograms
Every newspaper has an identifiable accent chip that sits harmoniously in the purple design family:
- **Dinakaran `[DK]`**: Ruby Rose `#E11D48` · Soft tint `#FFE4E6` / Dark `#4C0519`
- **Dinamalar `[DM]`**: Emerald Teal `#0D9488` · Soft tint `#CCFBF1` / Dark `#134E4A`
- **NIE / DIN `[ND]`**: Royal Indigo `#3B82F6` · Soft tint `#DBEAFE` / Dark `#1E3A8A`
- **The Hindu `[TH]`**: Imperial Violet `#7C3AED` · Soft tint `#EDE9FE` / Dark `#2E1065`

### 1.3. Semantic Status Tokens
- **Active**: Emerald `#16A34A` (Background: `#DCFCE7`, Border: `#86EFAC`)
- **Expiring / Renew Soon**: Amber `#F59E0B` (Background: `#FEF3C7`, Border: `#FCD34D`)
- **Urgent (≤ 6 days)**: Orange `#EA580C` (Background: `#FFEDD5`, Border: `#FDBA74`)
- **Expired**: Crimson `#E11D48` (Background: `#FFE4E6`, Border: `#FDA4AF`)
- **Staff / Free Copy**: Muted Slate-Violet `#6B7280` (Background: `#F3F4F6`)

---

## 2. Typography

1. **Headings & Display**: `Plus Jakarta Sans`, sans-serif (weights 600, 700, 800)
2. **Body & UI**: `Inter`, sans-serif (weights 400, 500, 600)
3. **Monospace (Dates, IDs, Phone)**: `JetBrains Mono` / `ui-monospace` (weight 500)
4. **Tamil Font Support**: `Noto Sans Tamil` via `next/font` (zero layout shift)

---

## 3. Spatial System (8-Point Grid)

- Standard spacing scale: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`
- Border Radii:
  - Small pills & badges: `8px` (`rounded-lg`)
  - Inputs & action buttons: `12px` (`rounded-xl`)
  - Elevated Cards & Modals: `16px`–`20px` (`rounded-2xl`)
- Shadow hierarchy:
  - Card resting: `0 1px 3px rgba(27, 11, 59, 0.05), 0 1px 2px rgba(27, 11, 59, 0.04)`
  - Card hover / Popover: `0 10px 25px -5px rgba(27, 11, 59, 0.1), 0 8px 10px -6px rgba(27, 11, 59, 0.05)`
  - Floating action / Command Palette: `0 25px 50px -12px rgba(27, 11, 59, 0.25)`

---

## 4. Micro-Interactions & Animation Standards

- Transition durations:
  - Hover states: `150ms ease-out`
  - Dialog / Modal expand: `200ms cubic-bezier(0.16, 1, 0.3, 1)`
  - Notification pulse: `2s infinite ease-in-out`
- **Accessibility**: Full adherence to `prefers-reduced-motion` (instant display when reduced motion is preferred).
- **Touch Ergonomics**: All interactive elements (toggles, phone links, tabs, buttons) maintain minimum `44px x 44px` tap target size on mobile devices.

---

## 5. Mobile-First Layout

- **Desktop (≥ 1024px)**: Collapsible deep violet sidebar, dense virtualized data tables, sticky multi-column headers, keyboard shortcuts (`Ctrl/Cmd+K` global search).
- **Mobile (< 1024px)**: Fixed frosted bottom navigation bar, card-based customer feed, swipe actions (quick call, renew, WhatsApp message), touch-friendly modals.
