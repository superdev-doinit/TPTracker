# PJ Tissue Tracker

Cost calculator, cheat sheet, and store survey for PJ tissue paper production. Built for floor staff — works offline on any phone.

**Live app:** https://superdev-doinit.github.io/TPTracker/

## What it does

- **Calculator** — pick roll dimensions, GSM, sheets per packet, raw material rate, and overhead. Get instant per-packet weight, paper cost, total cost, and wholesale/retail prices.
- **Cheat sheet** — step-by-step formula, allowed values, and a full 882-row combination matrix (7 L × 7 W × 3 GSM × 6 sheets) that updates live with rate and overhead.
- **Survey** — quick in-app form to capture store details (name, phone, store type, current tissue specs, consumption, vendor info, interest in website/app). Submissions go straight to a Google Sheet.
- **Shape quality indicator** — flags rectangular products that don't match a standard tissue shape (square or near-square within 10%).
- **Works offline** — installable as a home-screen app, no internet required after first load.

## Formula

```
Per Packet Weight (g) = (L × W × GSM × Sheets) / 10000
Packets per kg        = 1000 / Per Packet Weight
Paper cost / packet   = Raw Material Rate (₹/kg) / Packets per kg
Total cost / packet   = Paper cost + Other expenses
Wholesale price       = Total cost + ₹2
Retail price          = Total cost + ₹4
```

## Allowed values

- **Length (L)**: 27, 28, 29, 30, 31, 32, 33 cm
- **Width (W)**: same
- **Tissue GSM**: 15 (1 ply), 30 (2 ply), 45 (3 ply)
- **Sheets per packet**: 100, 85, 75, 70, 60, 50
- **Raw material rate**: ₹60 – ₹110 / kg (lower = harder, higher = softer)
- **Other expenses**: ~ ₹2 / packet (configurable)
- **Wholesale markup**: + ₹2 over total cost
- **Retail markup**: + ₹4 over total cost

## Tech

- Vanilla HTML / CSS / JS — no build step
- PWA with `manifest.json` + service worker for offline use
- Mobile-first responsive layout, iOS Safari tested

## Local development

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Survey setup (one-time)

The survey form needs a Google Apps Script backend to write rows to a Sheet. ~5 min setup:

1. Create a new Google Sheet (name it anything you like)
2. **Extensions → Apps Script** in the Sheet
3. Delete any code in the editor, paste the entire `Code.gs` file from this repo
4. Click **Save** (💾), name the project "PJ Survey Backend"
5. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** → authorize → copy the **Web App URL**
7. Open `js/app.js` in this repo, find `SURVEY_ENDPOINT`, paste the URL between the quotes
8. Commit & push. The Survey tab on the live app will start writing to your Sheet.

The Sheet will get a header row automatically on the first submission.
