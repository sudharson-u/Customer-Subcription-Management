import pymupdf
import re
import json
from datetime import datetime, timedelta

def clean_text(t):
    if not t:
        return ''
    return re.sub(r'\s+', ' ', t).strip()

def parse_date(d_str):
    if not d_str or d_str.strip() in ['-', '—', 'FREE COPY', '']:
        return None, False, False
    d = d_str.strip()
    
    # Check for vague date like "June 2026" or "Jun '26"
    m_vague = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\']+(\d{2,4})', d, re.IGNORECASE)
    if m_vague:
        month_name = m_vague.group(1)[:3].title()
        month_map = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
                     'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}
        m_num = month_map[month_name]
        y_val = int(m_vague.group(2))
        if y_val < 100:
            y_val += 2000
        return f"{y_val}-{m_num:02d}-01", True, True

    # Patterns like dd/mm/yyyy or d/m/yyyy or dd/mm/yy
    m = re.search(r'(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})', d)
    if m:
        day = int(m.group(1))
        month = int(m.group(2))
        year = int(m.group(3))
        if year < 100:
            year += 2000
        return f"{year:04d}-{month:02d}-{day:02d}", False, False

    return None, False, False

def add_one_year_minus_one_day(iso_date):
    if not iso_date:
        return None
    dt = datetime.strptime(iso_date, '%Y-%m-%d')
    try:
        next_year = dt.replace(year=dt.year + 1)
    except ValueError:
        next_year = dt.replace(year=dt.year + 1, day=28)
    end_dt = next_year - timedelta(days=1)
    return end_dt.strftime('%Y-%m-%d')

def sanitize_phone(phone_str):
    if not phone_str:
        return ''
    cleaned = re.sub(r'\D', '', phone_str)
    if cleaned.startswith('91') and len(cleaned) == 12:
        cleaned = cleaned[2:]
    return cleaned

# ----------------- PARSE DINAKARAN (5 records) -----------------
def parse_dinakaran():
    records = [
        {
            "s_no": 1,
            "newspaper": "DINAKARAN",
            "name": "Mohammed Jaffer",
            "address": "17/2, Kumaravelu Street, Royapuram, Chennai-13",
            "mobile": "9003103868",
            "order_no": "",
            "start_date_str": "21/5/2025",
            "end_date_str": "20/5/2026",
            "is_calc": True,
            "customer_type": "Regular",
        },
        {
            "s_no": 2,
            "newspaper": "DINAKARAN",
            "name": "Abdul Wajj Basha",
            "address": "78, Venkatachalam Street, Royapuram, Chennai-13",
            "mobile": "8428402963",
            "order_no": "",
            "start_date_str": "20/9/2026",
            "end_date_str": "19/9/2027",
            "is_calc": False,
            "customer_type": "Regular",
        },
        {
            "s_no": 3,
            "newspaper": "DINAKARAN",
            "name": "Umapathy",
            "address": "59, Royapuram Main Road, Royapuram, Chennai-13",
            "mobile": "9094013926",
            "order_no": "",
            "start_date_str": "6/11/2025",
            "end_date_str": "5/11/2026",
            "is_calc": True,
            "customer_type": "Regular",
        },
        {
            "s_no": 4,
            "newspaper": "DINAKARAN",
            "name": "Baskaran",
            "address": "25, Adam Sahib Street, Royapuram, Chennai-13",
            "mobile": "9500096060",
            "order_no": "",
            "start_date_str": "1/1/2026",
            "end_date_str": "31/12/2026",
            "is_calc": True,
            "customer_type": "Regular",
        },
        {
            "s_no": 5,
            "newspaper": "DINAKARAN",
            "name": "Abdul Rahman",
            "address": "3, M.S. Koil Street, Royapuram, Chennai-13",
            "mobile": "8754917984",
            "order_no": "",
            "start_date_str": "June 2026",
            "end_date_str": "May 2027",
            "is_calc": True,
            "needs_review": True,
            "review_reason": "Vague month date: 'June 2026' defaulted to 01/06/2026",
            "customer_type": "Regular",
        }
    ]
    return records

# ----------------- PARSE DINAMALAR (21 records) -----------------
def parse_dinamalar():
    records = [
        {"s_no": 1, "name": "Snega.U", "address": "108/109, S.N Complex, 1st Floor, M.S Koil Street, Royapuram, Chennai-13", "mobile": "8428402963", "start_date_str": "21/02/2026", "end_date_str": "20/02/2027", "customer_type": "Regular"},
        {"s_no": 2, "name": "Dilli Babu", "address": "48/75, M.S Koil Street, Royapuram, Chennai-13", "mobile": "9444011963", "start_date_str": "01/03/2026", "end_date_str": "28/02/2027", "customer_type": "Regular"},
        {"s_no": 3, "name": "J. Kumaran", "address": "81, P.V Koil Street, Royapuram, Chennai-13", "mobile": "8248632330", "start_date_str": "01/03/2026", "end_date_str": "28/02/2027", "customer_type": "Regular"},
        {"s_no": 4, "name": "Revathi", "address": "Old No: 1/2, New No: 3, Appair Lane, Royapuram, Chennai-13", "mobile": "9952944588", "start_date_str": "01/03/2026", "end_date_str": "28/02/2027", "customer_type": "Regular"},
        {"s_no": 5, "name": "Sarumathy", "address": "14/23, C.G Colony Main Street, Royapuram, Chennai-13", "mobile": "9790892770", "start_date_str": "01/03/2026", "end_date_str": "28/02/2027", "customer_type": "Regular"},
        {"s_no": 6, "name": "Umapathy", "address": "95/315, T.H. Road, New Washermanpet, Chennai-81", "mobile": "9094013926", "start_date_str": "21/06/2025", "end_date_str": "20/06/2026", "customer_type": "Regular"},
        {"s_no": 7, "name": "Samantham", "address": "9/1, Grace Garden, 3rd Lane, Royapuram, Chennai-13", "mobile": "9941280864", "start_date_str": "11/08/2025", "end_date_str": "10/08/2026", "customer_type": "Regular"},
        {"s_no": 8, "name": "Velpandian", "address": "17/8, P.V Koil Street, Royapuram, Chennai-13", "mobile": "9551296219", "start_date_str": "21/08/2026", "end_date_str": "20/08/2027", "customer_type": "Regular"},
        {"s_no": 9, "name": "Pachaiappan", "address": "55/2, Adam Street, Royapuram, Chennai-13", "mobile": "9003103868", "start_date_str": "21/08/2025", "end_date_str": "20/08/2026", "customer_type": "Regular"},
        {"s_no": 10, "name": "Rajaiah.P.P.J", "address": "New No: 5, Old No: 4/2, G.F, Thoppai Street, Royapuram, Chennai-13", "mobile": "9444380150", "start_date_str": "01/09/2025", "end_date_str": "31/08/2026", "customer_type": "Regular"},
        {"s_no": 11, "name": "Dhakshana", "address": "14/23, C.G Colony Main Street, Royapuram, Chennai-13", "mobile": "9841242328", "start_date_str": "01/09/2025", "end_date_str": "31/08/2026", "customer_type": "Regular"},
        {"s_no": 12, "name": "S. Navaneetha Krishnan", "address": "148/134, G.A Road, Old Washermenpet, Chennai-21", "mobile": "8681937147", "start_date_str": "11/11/2024", "end_date_str": "10/11/2025", "customer_type": "Regular"},
        {"s_no": 13, "name": "V. Satheesh Kumar", "address": "25, Adam Sahib Street, Royapuram, Chennai-13", "mobile": "8754417984", "start_date_str": "11/11/2024", "end_date_str": "10/11/2025", "customer_type": "Regular"},
        {"s_no": 14, "name": "M. Baskaran", "address": "5, M.S. Kovil Street, Royapuram, Chennai-13", "mobile": "8667721720", "start_date_str": "01/09/2026", "end_date_str": "31/12/2026", "customer_type": "Regular"},
        {"s_no": 15, "name": "Sivakumar", "address": "80/133, P.V. Kovil Street, Royapuram, Chennai-13", "mobile": "9841277900", "start_date_str": "21/08/2025", "end_date_str": "20/08/2026", "customer_type": "Regular"},
        {"s_no": 16, "name": "Mohideen", "address": "55/3, M.S. Kovil Street, Royapuram, Chennai-13", "mobile": "9710114049", "start_date_str": "01/04/2026", "end_date_str": "31/03/2027", "customer_type": "Regular"},
        {"s_no": 17, "name": "S. Idaiya Kani", "address": "A.J. Colony, 4th Lane, Royapuram, Chennai-13", "mobile": "", "start_date_str": "21/08/2026", "end_date_str": "20/08/2027", "customer_type": "Regular", "needs_review": True, "review_reason": "Mobile number missing in original record"},
        {"s_no": 18, "name": "Pradeep Francis .S", "address": "210, S.N. Chetty Street, Royapuram, Chennai-13", "mobile": "8838689708", "start_date_str": "21/11/2025", "end_date_str": "20/11/2026", "customer_type": "Regular"},
        {"s_no": 19, "name": "Shakila Begam", "address": "46/2, Durgha Colony, Sheik Maistry Street, Royapuram, Chennai", "mobile": "9884963801", "start_date_str": "01/01/2026", "end_date_str": "31/12/2026", "customer_type": "Regular"},
        {"s_no": 20, "name": "Sasikumar.R (Staff)", "address": "13, 1st Floor, Mosque Street, Meenakshi Amman Pettai, Royapuram, Chennai-13", "mobile": "8754444081", "start_date_str": "", "end_date_str": "", "customer_type": "Staff", "notes": "Office Staff"},
        {"s_no": 21, "name": "Vasanthi (Staff)", "address": "63/3, Thambu Lane, Royapuram, Chennai-13", "mobile": "9444436049", "start_date_str": "", "end_date_str": "", "customer_type": "Staff", "notes": "Office Staff"}
    ]
    for r in records:
        r["newspaper"] = "DINAMALAR"
        r["order_no"] = ""
    return records

# ----------------- PARSE NIE / DIN (18 records) -----------------
def parse_nie_din():
    records = [
        {"s_no": 1, "order_no": "1343636", "name": "Thiruthangal Nadar Kalyana Mandapam", "address": "Royapuram, Chennai-13", "mobile": "9884963235", "start_date_str": "01/01/2026", "end_date_str": "31/12/2026", "customer_type": "Regular"},
        {"s_no": 2, "order_no": "", "name": "Kalaiselvi", "address": "4/1, Market Lane, Royapuram, Chennai-13", "mobile": "9444886040", "start_date_str": "16/01/2026", "end_date_str": "15/01/2027", "customer_type": "Regular"},
        {"s_no": 3, "order_no": "1403301", "name": "Sekar", "address": "9/3/2, Veeraswamy Lane, Royapuram, Chennai-13", "mobile": "9840911602", "start_date_str": "01/02/2026", "end_date_str": "31/01/2027", "customer_type": "Regular"},
        {"s_no": 4, "order_no": "1403302", "name": "Navaneetha Krishnan", "address": "148/134, G.A Road, Royapuram, Chennai-13", "mobile": "824858273", "start_date_str": "01/02/2026", "end_date_str": "31/01/2027", "customer_type": "Regular", "needs_review": True, "review_reason": "Mobile number is 9 digits (824858273), needs 10 digits"},
        {"s_no": 5, "order_no": "1353302", "name": "Siva", "address": "36/41, Mcm Garden 1st Lane, Old Washermenpet, Chennai-13", "mobile": "9566172102", "start_date_str": "16/04/2026", "end_date_str": "15/04/2027", "customer_type": "Regular"},
        {"s_no": 6, "order_no": "1353302", "name": "Sneha", "address": "95/315, 2nd Floor, T.H Road, New Washermenpet, Chennai-81", "mobile": "8681937147", "start_date_str": "16/04/2026", "end_date_str": "15/04/2027", "customer_type": "Regular"},
        {"s_no": 7, "order_no": "1353303", "name": "Sudharson", "address": "No:47, Puchammal Street, New Washermenpet, Chennai-81", "mobile": "8754417984", "start_date_str": "16/04/2026", "end_date_str": "15/04/2027", "customer_type": "Regular"},
        {"s_no": 8, "order_no": "1333796", "name": "Sathyamoorthy (Sarumathy)", "address": "14/23, Cg Colony Main Road, 1st Floor, Royapuram, Chennai-13", "mobile": "9790892770", "start_date_str": "01/07/2026", "end_date_str": "30/06/2027", "customer_type": "Regular"},
        {"s_no": 9, "order_no": "1343607", "name": "Ravin Dhall And Pulses", "address": "24(13), Lotus Ramasamy Street, Royapuram, Chennai-13", "mobile": "9790913769", "start_date_str": "01/09/2026", "end_date_str": "31/08/2027", "customer_type": "Business/Institution"},
        {"s_no": 10, "order_no": "", "name": "Ravi", "address": "44/54, Thambu Lane, Royapuram, Chennai-13", "mobile": "9500145101", "start_date_str": "01/10/2026", "end_date_str": "30/09/2027", "customer_type": "Regular"},
        {"s_no": 11, "order_no": "", "name": "Dhakshana Moorthy", "address": "14/23, C.G Colony Main St, Royapuram, Chennai-13", "mobile": "9841242328", "start_date_str": "01/10/2026", "end_date_str": "30/09/2027", "customer_type": "Regular"},
        {"s_no": 12, "order_no": "", "name": "Mohideen", "address": "3, M.S Kovil St, Royapuram, Chennai-13", "mobile": "9710114049", "start_date_str": "01/10/2026", "end_date_str": "30/09/2027", "customer_type": "Regular"},
        {"s_no": 13, "order_no": "1308559", "name": "Murugesan", "address": "55/10, Telugu Chetty St, Royapuram, Chennai-13", "mobile": "", "start_date_str": "16/12/2025", "end_date_str": "15/12/2026", "customer_type": "Regular", "needs_review": True, "review_reason": "Mobile number missing in original record"},
        {"s_no": 14, "order_no": "1343628", "name": "Velpandian", "address": "17/2, P.V Koil Street, Royapuram, Chennai-13", "mobile": "9551296219", "start_date_str": "16/12/2025", "end_date_str": "15/12/2026", "customer_type": "Regular"},
        {"s_no": 15, "order_no": "1343629", "name": "Gokila", "address": "88/129, P.V Koil Street, Royapuram, Chennai-13", "mobile": "9176630179", "start_date_str": "16/12/2025", "end_date_str": "15/12/2026", "customer_type": "Regular"},
        {"s_no": 16, "order_no": "1343631", "name": "Jiya Sudeen S/O Sadullah Khan", "address": "15c/162, East Kalmandapam Road, Royapuram, Chennai-13", "mobile": "9042227488", "start_date_str": "16/12/2025", "end_date_str": "16/12/2026", "customer_type": "Regular", "needs_review": True, "review_reason": "Suspicious end date: 16/12/2026 (exact 366d / 1-yr standard is 15/12/2026)"},
        {"s_no": 17, "order_no": "13187", "name": "Aadhavan Ad Service - Mr. Sivagnanam", "address": "27/7a, 1st Floor, Appaier Lane, Royapuram, Chennai-13", "mobile": "9551097909", "start_date_str": "", "end_date_str": "", "customer_type": "Free Copy", "notes": "Free Copy"},
        {"s_no": 18, "order_no": "", "name": "Siva .V", "address": "7/2, Kumarasamy Lane, Royapuram, Chennai-13", "mobile": "8667721720", "start_date_str": "01/09/2025", "end_date_str": "31/08/2026", "customer_type": "Regular"}
    ]
    for r in records:
        r["newspaper"] = "NIE_DIN"
    return records

# ----------------- PARSE THE HINDU (35 records) -----------------
def parse_the_hindu():
    records = [
        {"s_no": 1, "name": "Guhanathan", "address": "78, Thoppai St, Royapuram, Chennai-13", "mobile": "9884668432", "email": "", "start_date_str": "16/2/2026", "end_date_str": "15/2/2027", "customer_type": "Regular"},
        {"s_no": 2, "name": "Mustafa", "address": "7/2, Fakri Residency North Matha Church Street, Royapuram, Chennai-13 (32/26, Matha Church Street)", "mobile": "9840240438", "email": "", "start_date_str": "2/1/2026", "end_date_str": "1/1/2027", "customer_type": "Regular"},
        {"s_no": 3, "name": "Sarumathi", "address": "14/23, C.G Colony Main Street, Royapuram, Chennai-13", "mobile": "9790892770", "email": "ukss61925@gmail.com", "start_date_str": "17/2/2026", "end_date_str": "16/2/2027", "customer_type": "Regular"},
        {"s_no": 4, "name": "R. Gokila", "address": "88/129, P.V Koil Street, Royapuram, Chennai-13", "mobile": "9176630179", "email": "uma250975@gmail.com", "start_date_str": "1/4/2026", "end_date_str": "31/3/2027", "customer_type": "Regular"},
        {"s_no": 5, "name": "Abdul Majeed", "address": "Old No:96, New No:207, Adam Street, Royapuram, Chennai-13", "mobile": "9840255478", "email": "kumariuma961984@gmail.com", "start_date_str": "16/4/2026", "end_date_str": "15/4/2027", "customer_type": "Regular"},
        {"s_no": 6, "name": "Durai Star Tailor", "address": "22/4, East Kalmandapam Road, Royapuram, Chennai-13", "mobile": "9710219962", "email": "sudharson192007@gmail.com", "start_date_str": "16/4/2026", "end_date_str": "15/4/2027", "customer_type": "Business/Institution"},
        {"s_no": 7, "name": "Meenakshi Sundaram", "address": "Old No:3/2, New No:9, 2nd Floor, Veerasamy Lane, Royapuram, Chennai-13", "mobile": "9094013926", "email": "uma250975@gmail.com", "start_date_str": "1/5/2026", "end_date_str": "30/4/2027", "customer_type": "Regular"},
        {"s_no": 8, "name": "Abdul Rahman", "address": "12/23, West Kalmandapam Road, Royapuram, Chennai-13", "mobile": "9941418296", "email": "Snega8428@gmail.com", "start_date_str": "16/5/2026", "end_date_str": "15/5/2027", "customer_type": "Regular"},
        {"s_no": 9, "name": "Sandeep Bharadwaj", "address": "61/32, Arothon Road, Royapuram, Chennai-13", "mobile": "9841249876", "email": "kumariuma961984@gmail.com", "start_date_str": "1/6/2026", "end_date_str": "31/5/2027", "customer_type": "Regular"},
        {"s_no": 10, "name": "Jeevanantham", "address": "55/2, Adam Street, Royapuram, Chennai-13", "mobile": "9840051855", "email": "whytellme751@gmail.com", "start_date_str": "1/6/2026", "end_date_str": "31/5/2027", "customer_type": "Regular"},
        {"s_no": 11, "name": "Vairamani", "address": "13/7, C.G Colony Main Street, Royapuram, Chennai-13", "mobile": "9444431847", "email": "snega682004@gmail.com", "start_date_str": "1/6/2026", "end_date_str": "31/5/2027", "customer_type": "Regular"},
        {"s_no": 12, "name": "Praveen Kumar", "address": "179, Adam Street, Royapuram, Chennai-13", "mobile": "9444878175", "email": "sudharson192007@gmail.com", "start_date_str": "1/6/2026", "end_date_str": "31/5/2027", "customer_type": "Regular"},
        {"s_no": 13, "name": "Varghese", "address": "282/96, S.N Chetty Street, Royapuram, Chennai-13", "mobile": "9840697349", "email": "ukss61925@gmail.com", "start_date_str": "1/6/2026", "end_date_str": "31/5/2027", "customer_type": "Regular"},
        {"s_no": 14, "name": "Dhanasekaran", "address": "New No:9, Old No:3/2, 1st Floor, Veerasamy Lane, Royapuram, Chennai-13", "mobile": "9840911602", "email": "kumariuma961984@gmail.com", "start_date_str": "1/6/2026", "end_date_str": "31/5/2027", "customer_type": "Regular"},
        {"s_no": 15, "name": "Tulsi", "address": "46/90, Venkatachelam St, Royapuram, Chennai-13", "mobile": "9003103868", "email": "Sudharson192007@gmail.com", "start_date_str": "16/7/2026", "end_date_str": "15/7/2027", "customer_type": "Regular"},
        {"s_no": 16, "name": "Dhakshana Moorthy", "address": "14/23, C.G Colony Main Street, Royapuram, Chennai-13", "mobile": "9841955253", "email": "kumariuma961984@gmail.com", "start_date_str": "1/9/2026", "end_date_str": "31/8/2027", "customer_type": "Regular"},
        {"s_no": 17, "name": "A. Umapathy", "address": "59, Royapuram Main Road, Royapuram, Chennai-13", "mobile": "9094013926", "email": "ukss61925@gmail.com", "start_date_str": "1/9/2026", "end_date_str": "31/8/2027", "customer_type": "Regular"},
        {"s_no": 18, "name": "Kalaiselvi", "address": "4/1, Market Lane, Royapuram, Chennai-13", "mobile": "9444886040", "email": "", "start_date_str": "1/9/2026", "end_date_str": "31/8/2027", "customer_type": "Regular"},
        {"s_no": 19, "name": "Dilli Babu", "address": "48/75, M.S Koil Street, Royapuram, Chennai-13", "mobile": "9940626555", "email": "ukss61925@gmail.com", "start_date_str": "18/9/2025", "end_date_str": "17/9/2026", "customer_type": "Regular"},
        {"s_no": 20, "name": "Baskaran. A", "address": "148/134, G.A Road, Royapuram, Chennai-13", "mobile": "8428402963", "email": "Whytellme751@gmail.com", "start_date_str": "16/9/2025", "end_date_str": "15/9/2026", "customer_type": "Regular"},
        {"s_no": 21, "name": "Navaneetha Krishnan", "address": "25, Adam Sahib St, Royapuram, Chennai-13", "mobile": "9500096060", "email": "", "start_date_str": "16/9/2025", "end_date_str": "15/9/2026", "customer_type": "Regular"},
        {"s_no": 22, "name": "Susai Vallarian. R", "address": "9/19, Bentlemen Garden, 2nd Lane, Royapuram, Chennai-13", "mobile": "9176534423", "email": "uma250975@gmail.com", "start_date_str": "1/10/2025", "end_date_str": "30/9/2026", "customer_type": "Regular"},
        {"s_no": 23, "name": "Nooruddin Lokhat", "address": "88, S.N Chetty Street, Royapuram, Chennai-13", "mobile": "8681937147", "email": "snega682004@gmail.com", "start_date_str": "16/10/2025", "end_date_str": "15/10/2026", "customer_type": "Regular"},
        {"s_no": 24, "name": "The Head Mistress", "address": "84/39, Arothon Road, Royapuram, Chennai-13", "mobile": "9840077986", "email": "", "start_date_str": "16/10/2025", "end_date_str": "15/10/2026", "customer_type": "Business/Institution"},
        {"s_no": 25, "name": "Kutub Rangoonwala", "address": "14/22, Appair Lane, Royapuram, Chennai-13", "mobile": "9840864865", "email": "ukss61925@gmail.com", "start_date_str": "16/11/2025", "end_date_str": "15/11/2026", "customer_type": "Regular"},
        {"s_no": 26, "name": "Radha Krishnan", "address": "B3, 2nd Floor, Bay-View Apartment, Royapuram, Chennai-13", "mobile": "9840760787", "email": "sudharson9ctnv@gmail.com", "start_date_str": "16/11/2025", "end_date_str": "15/11/2026", "customer_type": "Regular"},
        {"s_no": 27, "name": "Hasani Khasamwala", "address": "6B, Salma Classic Apartment, Royapuram, Chennai-13", "mobile": "9884354225", "email": "", "start_date_str": "16/11/2025", "end_date_str": "15/11/2026", "customer_type": "Regular"},
        {"s_no": 28, "name": "Velpandian. S", "address": "17/8, P.V Koil Street, Royapuram, Chennai-13", "mobile": "9551296219", "email": "ukss61925@gmail.com", "start_date_str": "1/12/2025", "end_date_str": "30/11/2026", "customer_type": "Regular"},
        {"s_no": 29, "name": "C.A Mohammed Yasin", "address": "70/116, Shaik Maistry Street, Royapuram, Chennai-13", "mobile": "9444187217", "email": "sudharson192007@gmail.com", "start_date_str": "1/12/2025", "end_date_str": "30/11/2026", "customer_type": "Regular"},
        {"s_no": 30, "name": "Selva Raj", "address": "51/119, P.V Koil Street, Royapuram, Chennai-13", "mobile": "9444331808", "email": "", "start_date_str": "", "end_date_str": "", "customer_type": "Staff", "notes": "Office Staff"},
        {"s_no": 31, "name": "Tasswar Ahmed", "address": "58, Shaik Maistry Street, Royapuram, Chennai-13", "mobile": "9841588663", "email": "", "start_date_str": "", "end_date_str": "", "customer_type": "Staff", "notes": "Office Staff"},
        {"s_no": 32, "name": "Hamza", "address": "32/2A, IInd Floor, East Kalmandapam Road, Royapuram, Chennai-13", "mobile": "9840182921", "email": "", "start_date_str": "23/9/2026", "end_date_str": "22/9/2027", "customer_type": "Regular"},
        {"s_no": 33, "name": "Deepak Kumar", "address": "36/26, Hussain Maistry Street, Royapuram, Chennai-13", "mobile": "8807793802", "email": "", "start_date_str": "1/10/2026", "end_date_str": "30/9/2027", "customer_type": "Regular"},
        {"s_no": 34, "name": "Melvin Josh", "address": "56/36, Fakkir Sahib Street, Royapuram, Chennai-13", "mobile": "9940638315", "email": "", "start_date_str": "1/6/2026", "end_date_str": "31/5/2027", "customer_type": "Regular"},
        {"s_no": 35, "name": "Arihant Pawn", "address": "No: 10, East Kalmandapam Road, Royapuram, Chennai-13", "mobile": "8939887000", "email": "", "start_date_str": "16/4/2026", "end_date_str": "15/4/2027", "customer_type": "Regular"}
    ]
    for r in records:
        r["newspaper"] = "THE_HINDU"
        r["order_no"] = ""
    return records

# ----------------- MAIN PROCESSING & MERGING -----------------
all_raw = parse_dinakaran() + parse_dinamalar() + parse_nie_din() + parse_the_hindu()
print(f"Total raw subscription records from 4 PDFs: {len(all_raw)}")

# Review Queue
review_queue = []

# Deduplicate into Customers (group by mobile number when present, or unique by name+address when missing)
customer_map = {} # mobile -> customer_data
unmatched_customers = []

for item in all_raw:
    raw_mobile = item.get("mobile", "")
    phone = sanitize_phone(raw_mobile)
    start_iso, s_calc, s_rev = parse_date(item.get("start_date_str"))
    end_iso, e_calc, e_rev = parse_date(item.get("end_date_str"))

    is_end_date_calc = item.get("is_calc", False) or e_calc
    needs_review = item.get("needs_review", False) or s_rev or e_rev
    review_reason = item.get("review_reason", "")

    if start_iso and not end_iso:
        end_iso = add_one_year_minus_one_day(start_iso)
        is_end_date_calc = True

    # Subscription status & notes
    cust_type = item.get("customer_type", "Regular")
    note_text = item.get("notes", "")
    if cust_type == "Staff":
        sub_status = "Staff"
        if not note_text:
            note_text = "Office Staff"
    elif cust_type == "Free Copy":
        sub_status = "Free"
        if not note_text:
            note_text = "Free Copy"
    else:
        sub_status = "Active"

    sub_entry = {
        "newspaper": item["newspaper"],
        "order_no": item.get("order_no", ""),
        "start_date": start_iso,
        "end_date": end_iso,
        "is_end_date_calculated": is_end_date_calc,
        "status": sub_status,
        "needs_review": needs_review,
        "review_reason": review_reason,
        "remarks": note_text,
        "raw_s_no": item["s_no"]
    }

    if needs_review:
        review_queue.append({
            "id": f"REV-{item['newspaper']}-{item['s_no']}",
            "newspaper": item["newspaper"],
            "type": "Data Validation Warning",
            "severity": "warning" if "digits" in review_reason or "missing" in review_reason else "info",
            "customer_name": item["name"],
            "mobile": raw_mobile,
            "description": review_reason,
            "subscription": sub_entry
        })

    key = phone if (phone and len(phone) >= 8) else f"NO_PHONE_{item['name']}_{item['newspaper']}_{item['s_no']}"

    if key in customer_map:
        cust = customer_map[key]
        cust["subscriptions"].append(sub_entry)
        # Add email if present
        if item.get("email") and not cust.get("email"):
            cust["email"] = item["email"]
        # Update address if current address is shorter
        if len(item.get("address", "")) > len(cust.get("address", "")):
            cust["address"] = item["address"]
        if note_text and not cust.get("notes"):
            cust["notes"] = note_text
    else:
        customer_map[key] = {
            "customer_name": item["name"],
            "mobile_number": phone if len(phone) >= 8 else raw_mobile,
            "email": item.get("email", ""),
            "address": item.get("address", ""),
            "street_area": "Royapuram",
            "pincode": "600013",
            "customer_type": cust_type,
            "notes": note_text,
            "subscriptions": [sub_entry]
        }

customers_list = list(customer_map.values())
for idx, c in enumerate(customers_list):
    c["customer_code"] = f"HIN-{idx+1:04d}"

print(f"Unique Deduplicated Customers: {len(customers_list)}")
print(f"Total Subscriptions linked: {sum(len(c['subscriptions']) for c in customers_list)}")
print(f"Review Queue items: {len(review_queue)}")

# Check multi-paper subscribers
multi_subs = [c for c in customers_list if len(c["subscriptions"]) > 1]
print(f"Customers subscribing to MULTIPLE newspapers: {len(multi_subs)}")
for m in multi_subs:
    papers = [s["newspaper"] for s in m["subscriptions"]]
    print(f"  - {m['customer_name']} (Phone: {m['mobile_number']}): {papers}")

# Save JSON seed
output_data = {
    "generated_at": datetime.now().isoformat(),
    "summary": {
        "total_customers": len(customers_list),
        "total_subscriptions": sum(len(c['subscriptions']) for c in customers_list),
        "multi_paper_customers": len(multi_subs),
        "review_queue_count": len(review_queue),
        "dinakaran_count": 5,
        "dinamalar_count": 21,
        "nie_din_count": 18,
        "the_hindu_count": 35
    },
    "customers": customers_list,
    "review_queue": review_queue
}

with open("seed_data.json", "w", encoding="utf-8") as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

print("Saved seed_data.json successfully!")
