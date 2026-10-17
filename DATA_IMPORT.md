# DATA IMPORT SPECIFICATION & RECONCILIATION REPORT
**Platform:** Hindu Multi-Newspaper Subscription Portal
**Zone:** Royapuram, Chennai - 600013 and nearby areas (New/Old Washermanpet)

---

## 1. Summary of Source Registers

| Publication | Document | Total Records | Active / Regular | Staff Copies | Free Copies | Notes / Exceptions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dinakaran** | `Dinakaran Details.pdf` | 5 | 5 | 0 | 0 | 1 vague month date ("June 2026"), 3 1-year auto-calculated |
| **Dinamalar** | `Dinamalar_Details (1).pdf` | 21 | 19 | 2 | 0 | 2 staff rows without dates, 1 missing phone (S. Idaiya Kani) |
| **NIE / DIN** | `NIE_DIN_Customer_Details_v3.pdf` | 18 | 17 | 0 | 1 | 1 Free Copy (Aadhavan Ad Service), 1 missing phone (Murugesan), 1 9-digit phone (Navaneetha Krishnan) |
| **The Hindu** | `The Hindu Customer Details.pdf` | 35 | 33 | 2 | 0 | 2 office staff, S.No 17 & 18 omitted in source numbering |
| **TOTALS** | **4 PDF Registers** | **77** | **74** | **4** | **1** | **Deduplicated to 58 unique customers (13 multi-paper)** |

---

## 2. Deduplication and Multi-Paper Consolidation

When the same phone number or entity appears in multiple registers, they are consolidated into **ONE primary Customer record**, and individual **Subscription records** are linked to their respective publications:

### Key Cross-Paper Subscribers:
1. **Mohammed Jaffer / Pachaiappan / Tulsi** (`9003103868`):
   - Dinakaran (21/05/2025 – 20/05/2026)
   - Dinamalar (21/08/2025 – 20/08/2026)
   - The Hindu (16/07/2026 – 15/07/2027)
2. **Abdul Wajj Basha / Snega.U / Baskaran. A** (`8428402963`):
   - Dinakaran (20/09/2026 – 19/09/2027)
   - Dinamalar (21/02/2026 – 20/02/2027)
   - The Hindu (16/09/2025 – 15/09/2026)
3. **Umapathy / Meenakshi Sundaram** (`9094013926`):
   - Dinakaran (06/11/2025 – 05/11/2026)
   - Dinamalar (21/06/2025 – 20/06/2026)
   - The Hindu (01/05/2026 – 30/04/2027)
4. **Baskaran / Navaneetha Krishnan** (`9500096060`):
   - Dinakaran (01/01/2026 – 31/12/2026)
   - The Hindu (16/09/2025 – 15/09/2026)
5. **Sarumathy / Sathyamoorthy** (`9790892770`):
   - Dinamalar (01/03/2026 – 28/02/2027)
   - NIE / DIN (01/07/2026 – 30/06/2027)
   - The Hindu (17/02/2026 – 16/02/2027)
6. **Velpandian / Velpandian. S** (`9551296219`):
   - Dinamalar (21/08/2026 – 20/08/2027)
   - NIE / DIN (16/12/2025 – 15/12/2026)
   - The Hindu (01/12/2025 – 30/11/2026)
7. **Dhakshana / Dhakshana Moorthy** (`9841242328`):
   - Dinamalar (01/09/2025 – 31/08/2026)
   - NIE / DIN (01/10/2026 – 30/09/2027)
8. **S. Navaneetha Krishnan / Sneha / Nooruddin Lokhat** (`8681937147`):
   - Dinamalar (11/11/2024 – 10/11/2025)
   - NIE / DIN (16/04/2026 – 15/04/2027)
   - The Hindu (16/10/2025 – 15/10/2026)
9. **V. Satheesh Kumar / Sudharson** (`8754417984`):
   - Dinamalar (11/11/2024 – 10/11/2025)
   - NIE / DIN (16/04/2026 – 15/04/2027)
10. **M. Baskaran / Siva .V** (`8667721720`):
    - Dinamalar (01/09/2026 – 31/12/2026)
    - NIE / DIN (01/09/2025 – 31/08/2026)
11. **Mohideen** (`9710114049`):
    - Dinamalar (01/04/2026 – 31/03/2027)
    - NIE / DIN (01/10/2026 – 30/09/2027)
12. **Sekar / Dhanasekaran** (`9840911602`):
    - NIE / DIN (01/02/2026 – 31/01/2027)
    - The Hindu (01/06/2026 – 31/05/2027)
13. **Gokila / R. Gokila** (`9176630179`):
    - NIE / DIN (16/12/2025 – 15/12/2026)
    - The Hindu (01/04/2026 – 31/03/2027)

---

## 3. Review Queue (Items Flagged for Verification)

The system automatically detects anomalies and places them in the **Review Queue**:
1. **The Hindu Missing S.No 17 & 18**: The original document ends page 1 at S.No 16 and begins page 2 at S.No 19. Flagged for physical card check.
2. **Navaneetha Krishnan (NIE/DIN)**: Mobile `824858273` is 9 digits (missing leading digit or typo).
3. **Jiya Sudeen (NIE/DIN)**: End date listed as `16/12/2026` from start `16/12/2025` (366 days instead of 365 days / 15/12/2026).
4. **Abdul Rahman (Dinakaran)**: Start date handwritten as `"June 2026"`; defaulted to `01/06/2026` with 1-year calculated end date `31/05/2027`.
5. **Murugesan (NIE/DIN)**: Missing phone number; marked with badge `Mobile missing`.
6. **S. Idaiya Kani (Dinamalar)**: Missing phone number; marked with badge `Mobile missing`.

---

## 4. Date Normalization Logic

- Date inputs are stored in ISO format `YYYY-MM-DD` and displayed in `DD/MM/YYYY`.
- Where only start date was present, end date is computed as:
  $$\text{EndDate} = \text{StartDate} + 1\text{ year} - 1\text{ day}$$
  and marked `is_end_date_calculated = true`.
- Free copy and Staff subscriptions are exempted from automated end dates and expiry alerts.
