# Market Rates — API & Flow Reference

> **Scope:** Admin page `http://localhost:3000/market-rates` + backend `Sow_backend_v1`  
> **Last updated:** 2026-05-18 — use this file when working only on market rates today.

---

## 1. Local setup (must match)

| App | Folder | URL | Config file |
|-----|--------|-----|-------------|
| Admin UI | `Admin_Sow` | `http://localhost:3000` | `Admin_Sow/src/app/Config/BaseUrl.jsx` |
| API | `Sow_backend_v1` | `http://localhost:3002` | `.env` → `PORT=3002` |

**Base URL in admin (current):**

```js
export const Base_url = "http://localhost:3002/v1/"
```

All frontend calls are: `{Base_url}<route>` → e.g. `http://localhost:3002/v1/mandiRates`

**Run backend:**

```bash
cd Sow_backend_v1
npm run dev
```

---

## 2. Page map (frontend)

| Route | Component | Role |
|-------|-----------|------|
| `/market-rates` | `MarketRates.jsx` | Main table, Excel import/export, **Market Rates AI** button |
| `/market-rates-view/:id` | `MarketRatesView.jsx` | Single mandi detail + manual price edit |
| `/mandi-rates` | `MandiRates.jsx` | CRUD mandis |
| `/excel-market-rates` | `ExcelMarketRates.jsx` | Legacy excel rates |
| `/daily-rates` | `DailyRate.jsx` | Daily rates (separate feature) |

**Key files:**

- `Admin_Sow/src/app/pages/MarketRates/MarketRates.jsx` — list + filters + Excel + opens AI modal
- `Admin_Sow/src/app/pages/MarketRates/MarketRatesAIModal.jsx` — AI message upload UI
- `Admin_Sow/src/app/routing/PrivateRoutes.jsx` — route definitions
- `Admin_Sow/src/app/Config/BaseUrl.jsx` — API base URL

---

## 3. End-to-end flow diagram

### 3A. Market Rates AI (message paste → DB)

```
User clicks "Market Rates AI" (MarketRates.jsx)
        ↓
MarketRatesAIModal opens
        ↓
POST {Base_url}market-rates/parse
Body: { "message": "<whatsapp-style text>" }
        ↓
marketRateParser.controller.js → parseMarketRateMessage
        ↓
marketRateParser.service.js → parseAndUpdate(message)
   1. aiAgent.service.js      → OpenAI parses date/time/categories/mandis/prices
   2. vectorEmbedding.service → match category, subcategory, mandi (Mongo VectorEmbedding)
   3. updateDatabase()         → upsert MandiCategoryPrice documents
        ↓
Response → modal shows parsed / matched / updated / warnings
        ↓
onSuccess() → setUpdate(+1) → MarketRates.jsx refetches GET mandiRates
```

### 3B. Main table data (no AI)

```
MarketRates.jsx mount / update
        ↓
GET mandi          → list mandis + categories
GET mandiRates     → all mandi category prices (table rows)
GET unifiedPinCode → states for filter
POST subcategories/category → subcategory names per category
```

### 3C. Upload Excel (bulk import → DB)

**UI:** `MarketRates.jsx` → button **"Upload Excel"** (hidden `<input type="file">`)
**Library:** `xlsx` (SheetJS) — reads first sheet only
**Prerequisite:** `GET mandi` must have run first (`mandiData` used to resolve `mandiId`)

```
User clicks "Upload Excel" → selects .xlsx / .xls
        ↓
handleImport(event) — FileReader → XLSX.read
        ↓
validateExcelStructure(workbook, mandiData)         ← NEW pre-flight
   • file issues:   no sheets, empty sheet, mandi list not loaded
   • column issues: empty / extra-space / duplicate / missing / case-mismatch / unknown
   • row issues:    empty required fields, bad price, bad date/time, bad unit,
                    Mandi Name + Category not found in DB
        ↓
Issues found?  ── YES ──►  ExcelValidationModal pops up with full issue table.
                            • file/column errors → BLOCK upload entirely
                            • row errors only    → "Upload N valid rows anyway" button
                            • "Download invalid rows" Excel for offline fixing
        │ NO  (or user clicks "Upload N valid rows anyway")
        ▼
handleSaveAll(rows, fileName)
        ↓
ExcelUploadProgressModal opens (mirrors AI modal UX):
   • CircularProgress + LinearProgress + cycling status text
   • Elapsed timer
   • Window cannot be closed while the request is in flight
        ↓
POST {Base_url}mandiRates/mandi-prices
Body: { mandiPrices: [ { mandiId, category, subCategory, price, date, time, unit } ] }
        ↓
mandiRates.controller.js → saveOrUpdateMandiCategoryPrices
   • validate ObjectId mandiId, time (12h AM/PM), unit (Kg|Ton)
   • bulkWrite: update existing category row OR $addToSet new categoryPrices entry
   • push notification to all users (mandiRatesUpdate)
   • returns { processed, skipped, skippedEntries[], message }
        ↓
200 → progress modal flips to result view:
   • green alert  → full success
   • orange alert → partial (processed > 0 && skipped > 0)
   • red alert    → nothing uploaded (processed === 0)
   • chips: Uploaded / Skipped / Submitted
   • Server-skipped table + "Download skipped Excel" button (if any)
   • onSuccess → setUpdate(+1) → GET mandiRates refreshes table
```

**Validation modal — issue shape** (one popup, all issues at once):

```js
issues = {
  fileIssues:   [ { issue } ],
  columnIssues: [ { column, expected, received, issue, severity: 'error'|'warning' } ],
  rowIssues:    [ {
    rowNumber: 5,                  // 1-based Excel row (incl. header)
    rowData:   { 'Mandi Name', Date, Category, 'Sub Category', Time, Price, Unit },
    issues:    [ { field, expected, received, issue } ]
  } ]
}
```

Example column error: `expected: "Destination"`, `received: " Destination "`,
`issue: "Extra spaces detected in column name"`.

**Excel column headers (exact names, case-sensitive in code):**

| Column in file | Maps to API field | Notes |
|----------------|-------------------|--------|
| `Mandi Name` | → lookup `mandiId` | Must match `mandi.mandiname` (case-insensitive) |
| `Category` | `category` | Mandi must have this category in `mandi.categories` |
| `Sub Category` | `subCategory` | Passed through; not validated on frontend |
| `Date` | `date` | See date formats below; fallback = page `selectedDate` |
| `Time` | `time` | `10:30 AM` or Excel decimal (0.0–1.0); default `10:00 AM` |
| `Price` | `price` | Rows with `0`, blank, `NA` are **skipped** |
| `Unit` | `unit` | Default `Kg`; backend only accepts `Kg` or `Ton` |

**Date formats accepted on import:**

- `YYYY-MM-DD`
- `DD-MM-YYYY` → converted to `YYYY-MM-DD`
- `DD/MM/YYYY` → converted
- Excel serial number (numeric cell)
- Invalid / empty → uses `selectedDate` from page UI

**Mandi matching rule (frontend only):**

```js
mandiData.find(m =>
  mandi.categories.some(cat => cat.toLowerCase() === category.toLowerCase()) &&
  mandi.mandiname.toLowerCase() === mandiName.toLowerCase()
)
```

If no match → `mandiId: "N/A"` → row dropped (counted in skip alert).

**Rows skipped before API call:**

- Price is 0, empty, `NA`, or not a number
- `mandiId === "N/A"` (mandi name + category combo not in DB)

**Request body example:**

```json
{
  "mandiPrices": [
    {
      "mandiId": "674a1b2c3d4e5f6789012345",
      "category": "M.S Ingot",
      "subCategory": "Melting Scrap",
      "price": 39700,
      "date": "2026-05-18",
      "time": "11:00 AM",
      "unit": "Ton"
    }
  ]
}
```

**Success response (`200`):**

```json
{
  "message": "Mandi prices updated successfully. Processed N entries.",
  "processed": 10,
  "skipped": 2,
  "skippedEntries": [ { "index", "mandiId", "category", "subCategory", "reason" } ]
}
```

**Backend file:** `src/controllers/mandiRates.controller.js` → `saveOrUpdateMandiCategoryPrices`  
**Route:** `POST /v1/mandiRates/mandi-prices` in `mandiRates.routes.js`

See also: `UPDATE_MANDI_RATES_WITH_TIME.md`

---

### 3D. Download Excel (export template / current data)

**UI:** `MarketRates.jsx` → button **"Download Excel"**  
**Output file:** `MarketRates.xlsx` (client-side only, no API call)

```
User clicks "Download Excel"
        ↓
handleExport()
        ↓
Data source:
  • If table has rows (`row` state) → export current filtered table data
  • Else → build skeleton from mandiData + subCategoryData
            (filtered by selectedState if not "All")
        ↓
Uses selectedDate + selectedTime from page (or today + 10:00)
        ↓
XLSX.utils.json_to_sheet → writeFile("MarketRates.xlsx")
```

**Exported columns (same as import expects):**

`Mandi Name` | `Date` | `Category` | `Sub Category` | `Time` | `Price` | `Unit`

- Template mode (no table rows): Price defaults to `0`, Unit to `Kg`
- User fills prices in Excel, then uses **Upload Excel**

---

### 3E. Delete row

```
DELETE mandiRates/:mandiId/:category/:subCategory
(category & subCategory URL-encoded)
```

---

## 4. API reference (used by `/market-rates`)

Base: `http://localhost:3002/v1`

### AI parser (`/market-rates`)

| Method | Path | Body | Notes |
|--------|------|------|-------|
| `POST` | `/market-rates/parse` | `{ message: string, source?: string }` | Parses WhatsApp-style text |
| `GET` | `/market-rates/parse/jobs/:jobId` | — | Poll async job result |

**Sync vs async (important):**

- **Development (default):** sync — waits, returns `200` with full `data`.
- **Production (default):** async — returns `202` + `jobId`; client must poll `GET .../jobs/:jobId`.
- Force sync: `POST /market-rates/parse?sync=1`
- Force async: `POST /market-rates/parse?async=1`
- Env: `MARKET_RATE_PARSE_ASYNC_DEFAULT=true|false`

**Polling (now implemented):** `MarketRatesAIModal.jsx` detects `202` / `status:'pending'`, polls `GET .../parse/jobs/:jobId` every 2.5 s, and only renders the final success/failure UI after the job completes. This is what unblocks the production success toast — previously the modal treated the 202 "Parsing started" body as terminal.

**Success response shape:**

```json
{
  "success": true,
  "message": "Market rates added successfully. N prices added. M rates failed validation",
  "data": {
    "parsed":  { "date": "YYYY-MM-DD", "time": "HH:MM AM/PM", "rates": [] },
    "matched": { "categories": [], "subCategories": [], "mandis": [] },
    "created": { "mandis": [] },
    "updated": { "mandiCategoryPrices": 0 },
    "warnings": ["human-readable warning strings (backward compat)"],
    "failed": [
      {
        "category":        "M.S Ingot",
        "subCategory":     "Melting Scrap",
        "mandi":           "Mujfernagar",
        "price":           39700,
        "priceDifference": 0,
        "unit":            "Ton",
        "reason":          "Mandi 'Mujfernagar' could not be matched in DB",
        "missingFields":   ["mandi"]
      }
    ]
  }
}
```

**`failed[]` is the canonical per-row validation list** consumed by the AI
modal: it renders the table and produces the "Download Failed Rates Excel"
output (same columns as the upload template). Possible `missingFields`
values: `category`, `subCategory`, `mandi`, `price`.

**Async polling contract** (production default — used by the modal):

```
1) POST /v1/market-rates/parse          → 202 { success:true, status:'pending', jobId, pollPath }
2) GET  /v1/market-rates/parse/jobs/:id → 202 { status:'pending' }            // keep polling
                                       → 200 { status:'completed', ...data } // success payload
                                       → 200 { status:'failed',  message }   // hard fail
```

Modal polls every 2.5 s with a 5 min safety cap.

### Mandi rates (main CRUD for table)

| Method | Path | Used for |
|--------|------|----------|
| `GET` | `/mandiRates` | Load table |
| `POST` | `/mandiRates/mandi-prices` | **Upload Excel** bulk save (`mandiPrices[]`) |
| `DELETE` | `/mandiRates/:mandiId/:category/:subCategory` | Delete price row |
| `PATCH` | `/mandiRates/:mandiId/:category/:subCategory` | Update (view page) |
| `POST` | `/mandiRates` | Create (view page) |
| `GET` | `/mandiRates/history/mandi/:mandiId` | History on view page |

### Supporting APIs

| Method | Path | Used for |
|--------|------|----------|
| `GET` | `/mandi` | Mandi list |
| `GET` | `/mandi/:id` | Single mandi (view page) |
| `POST` | `/subcategories/category` | `{ categoryName }` → subcategories |
| `GET` | `/v1/unifiedPinCode` | State dropdown (note: no `Base_url` prefix in code — full path on same host) |

### Legacy (avoid for new work)

| Path | Note |
|------|------|
| `/marketRates` | Old `MarketRates` model — not used by current main page |
| `CreateRate.jsx` → `market_rates/` | Legacy create flow |

---

## 5. Backend file map (`Sow_backend_v1`)

```
src/
├── app.js                          # app.use('/v1', routes)
├── routes/v1/
│   ├── index.js                    # mounts /market-rates, /mandiRates, /mandi, ...
│   ├── marketRateParser.routes.js  # POST /parse, GET /parse/jobs/:jobId
│   └── mandiRates.routes.js        # table CRUD + mandi-prices
├── controllers/
│   ├── marketRateParser.controller.js
│   └── mandiRates.controller.js
├── services/
│   ├── marketRateParser.service.js # parseAndUpdate — main orchestration
│   ├── aiAgent.service.js          # OpenAI message → structured JSON
│   └── vectorEmbedding.service.js  # cosine match categories/mandis
├── models/
│   ├── MandiRates.model.js         # MandiCategoryPrice collection
│   ├── MarketRateParseJob.model.js # async job store (TTL 24h)
│   ├── Mandi.model.js
│   ├── category.modal.js
│   ├── subCategory.modal.js
│   └── VectorEmbedding (see vector service)
└── config/config.js                # OPENAI_*, VECTOR_*, MARKET_RATE_PARSE_ASYNC_DEFAULT
```

**Route registration** (`routes/v1/index.js`):

```js
{ path: '/market-rates', route: marketRateParserRoute }  // AI
{ path: '/mandiRates', route: MandiRatesRoute }            // table data
{ path: '/mandi', route: MandiRateRoute }
```

---

## 6. Upload Excel — backend `saveOrUpdateMandiCategoryPrices`

1. **Validate** `mandiPrices` is a non-empty array.
2. **Filter** entries: skip if `mandiId` missing, `"N/A"`, or invalid MongoDB ObjectId.
3. **Validate** each entry:
   - `time` must match `/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/`
   - `unit` must be `Kg` or `Ton` (if provided)
4. **Bulk write** (two passes per entry):
   - **Pass 1 — update:** `filter: { mandi, 'categoryPrices.category': category }` → `$set` price, subCategory, date, time, unit on matched array element
   - **Pass 2 — insert:** `filter: { mandi }` → `$addToSet` new `categoryPrices` object; `upsert: true` creates doc if mandi has no prices yet
5. **Notify** all users via push (`mandiRatesUpdate`).

**AI vs Excel — same DB, different path:**

| | Market Rates AI | Upload Excel |
|--|-----------------|--------------|
| Endpoint | `POST /market-rates/parse` | `POST /mandiRates/mandi-prices` |
| Input | Free-text WhatsApp message | `.xlsx` with fixed columns |
| Mandi match | OpenAI + vector embeddings | Exact name + category from `GET mandi` |
| Category match | AI + vectors | String from Excel (must exist on mandi) |
| Creates mandis | No | No |

Both end up in **`MandiCategoryPrice`** collection (`MandiRates.model.js`).

---

## 7. AI parser — what happens inside `parseAndUpdate`

1. **`parseMessage(message)`** — OpenAI extracts:
   - `date` (YYYY-MM-DD), `time` (12h AM/PM)
   - `rates[]` with `category`, `subCategory`, `mandiPrices[]` (`mandi`, `price`, `priceDifference`, `unit`)

2. **`matchEntities(parsed)`** — for each rate line:
   - Category: vector match → subcategory parent → fuzzy string
   - Subcategory: loose name match within category → scoped embeddings
   - Mandi: vector + DB lookup (does not create new mandis)

3. **`updateDatabase()`** — writes to **`MandiCategoryPrice`**:
   - Keyed by mandi + category + subCategory + date + time
   - Updates price / priceDifference / unit

**Warnings** (non-fatal): unmatched mandi, low similarity, missing subcategory, etc.

---

## 8. Environment variables (backend `.env`)

Required for AI:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
VECTOR_SIMILARITY_THRESHOLD=0.85
MONGODB_URL=...
```

Optional:

```env
PORT=3002
MARKET_RATE_PARSE_ASYNC_DEFAULT=false   # set true to test async locally
```

**One-time / after new categories or mandis:**

```bash
node scripts/generateVectorEmbeddings.js
```

See also: `MARKET_RATE_PARSER_USAGE.md`, `AI_AGENT_VECTOR_STORAGE_IMPLEMENTATION.md`

---

## 9. Example formats

### AI message

```
👑 King Steel 👑
Date-15-12-2025
Time-11:00 AM
*M.S Ingot*
Mandi Gobindgarh=39700(+0)
Bhavnagar=38800(+0)
*Old Scrap*
Melting Scrap=31500(+0)
```

### Excel row (after filling template)

| Mandi Name | Date | Category | Sub Category | Time | Price | Unit |
|------------|------|----------|--------------|------|-------|------|
| Gobindgarh | 2026-05-18 | M.S Ingot | Melting Scrap | 11:00 AM | 39700 | Ton |

---

## 10. Debugging checklist

### General

| Symptom | Check |
|---------|--------|
| Network error / CORS | Backend running on `3002`, `Base_url` ends with `/v1/` |
| 400 Message required | Empty textarea in modal |
| Parsed but 0 prices saved | Warnings in response; mandi/category not in DB; run embedding script |
| Modal shows success but table empty | `onSuccess` → `setUpdate`; verify `GET mandiRates` |
| Hangs then 504 in prod | Async mode — polling now built-in; check Network tab for `parse/jobs/:id` calls |
| Prod: no success toast after upload | Job still polling — modal shows progress; if no completion, check `MarketRateParseJob` collection and server logs |
| OpenAI errors | `OPENAI_API_KEY`, credits, model name |
| "Download Failed Rates Excel" disabled | `response.data.failed` empty — nothing actually failed |

### Excel upload

| Symptom | Check |
|---------|--------|
| Validation modal "Upload blocked" | Fix header issues (spaces, case, missing, duplicates) listed in **Column issues** table |
| "Required column is missing" | Add the named column with exact spelling/case (`Mandi Name`, `Sub Category`, etc.) |
| "Extra spaces detected" | Trim leading/trailing spaces from the header cell |
| "Column name case mismatch" | Backend / lookup is case-sensitive — rename to the exact expected name |
| "No mandi found with this Mandi Name + Category combination" | Add the mandi/category in **Mandi Rates** page first |
| "Date format not recognized" | Use `YYYY-MM-DD`, `DD-MM-YYYY`, `DD/MM/YYYY`, or Excel date cell |
| "Time format not recognized" | Use `hh:mm AM/PM` or Excel decimal time |
| "Unit must be Kg or Ton" | Case-sensitive — `kg`/`KG`/`tons` are rejected |
| 400 Invalid time format | Time must be `11:00 AM` not `11:00` or 24h |
| 400 Invalid input | Body must be `{ mandiPrices: [...] }` |
| Import works but wrong subcategory updated | Backend updates by **category only** in pass 1 — duplicate categories with different subcategories can conflict |
| Same file won't re-upload after a fix | Already handled — input value is cleared on each `handleImport` |
| Browser `alert()` appears after upload | Should no longer happen — all feedback now flows through `ExcelUploadProgressModal`. Check that file is current (`MarketRates.jsx`) and the modal is rendered. |
| Skipped rows on server | Open the progress modal's **Skipped by server** table; click **Download skipped Excel** for offline review. Reason field comes from the backend `skippedEntries[]`. |

**Quick API test (Excel endpoint):**

```bash
curl -X POST "http://localhost:3002/v1/mandiRates/mandi-prices" \
  -H "Content-Type: application/json" \
  -d "{\"mandiPrices\":[{\"mandiId\":\"<valid-mandi-id>\",\"category\":\"M.S Ingot\",\"subCategory\":\"Test\",\"price\":100,\"date\":\"2026-05-18\",\"time\":\"10:00 AM\",\"unit\":\"Kg\"}]}"
```

**Quick API test (AI sync):**

```bash
curl -X POST "http://localhost:3002/v1/market-rates/parse?sync=1" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Date-18-05-2026\\nTime-10:00 AM\\n*Test*\\nMandi Gobindgarh=100\"}"
```

---

## 11. Related docs in repo

| File | Content |
|------|---------|
| `MARKET_RATE_PARSER_USAGE.md` | Parser setup, embeddings, costs |
| `AI_AGENT_VECTOR_STORAGE_IMPLEMENTATION.md` | Vector DB design |
| `UPDATE_MANDI_RATES_WITH_TIME.md` | mandi-prices time/unit API details |
| `.cursor/rules/market-rates.mdc` | Cursor agent rules for this feature |

---

## 12. Page buttons → flows (quick map)

| Button | Handler | API | Ref section |
|--------|---------|-----|-------------|
| Market Rates AI | `MarketRatesAIModal` | `POST /market-rates/parse` | §3A |
| Upload Excel | `handleImport` → `handleSaveAll` | `POST /mandiRates/mandi-prices` | §3C |
| Download Excel | `handleExport` | None (client XLSX) | §3D |
| Delete (table row) | `handleDelete` | `DELETE /mandiRates/...` | §3E |
| (page load) | `getAllData`, `getMandi` | `GET /mandiRates`, `GET /mandi` | §3B |

---

## 13. Today's work — common touch points

| Task | Where to edit |
|------|----------------|
| AI upload UI / polling | `MarketRatesAIModal.jsx` |
| Excel import / export / column mapping | `MarketRates.jsx` → `handleImport`, `handleExport`, `handleSaveAll` |
| Excel bulk save API | `mandiRates.controller.js` → `saveOrUpdateMandiCategoryPrices` |
| Table / filters | `MarketRates.jsx` → `getAllData` |
| Parse logic / matching | `marketRateParser.service.js` |
| API contract / async | `marketRateParser.controller.js` |
| New endpoint | `marketRateParser.routes.js` or `mandiRates.routes.js` + `routes/v1/index.js` |
| DB schema for prices | `MandiRates.model.js` |
| Add mandi before Excel works | `MandiRates.jsx` + `GET/POST /mandi` |
