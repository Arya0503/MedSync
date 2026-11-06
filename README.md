# MedBridge

> **A Source-Traceable Medication Continuity and Safe Handover System**  
> *Problem Statement 4: The Forgotten Prescription: Medication Continuity & Safe Handover*

MedBridge provides patients, clinicians, and pharmacists with one clear, source-traceable record of medication instructions across healthcare visits. Uploaded medical documents (discharge summaries, prescriptions, clinic notes) are parsed **entirely locally**, every extracted dosage links back to its exact coordinate in the source document, medication lists are compared across historical visits, discrepancies are deterministically flagged, and unresolved items route to an audited pharmacist review queue.

---

## 🔒 Seven Inviolable Principles

1. **Fully Functional Production System**: Built on Next.js 14, TypeScript, Tailwind CSS, PostgreSQL, and Prisma ORM. No mock interfaces, dead buttons, or "coming soon" placeholders.
2. **Strict Clinical Safety Boundary**: Synthetic data only. MedBridge never prescribes, substitutes medicines, alters dosages, or tells patients to stop/start medications. Clinical decisions remain with licensed healthcare professionals.
3. **Constraint 7 (Zero Cloud AI & Privacy)**: All OCR, document parsing, token signing, and PDF generation run on local infrastructure. Zero data is transmitted to external cloud LLMs, CDNs, or third-party APIs.
4. **Constraint 6 (WCAG 2.2 AA Accessibility)**: Fully operable via keyboard alone, screen-reader friendly, semantic HTML tables and landmarks, non-reliance on color alone (distinct geometric shapes for severity), and a dedicated Simple Mode.
5. **Clear Visual Navigation**: Primary actions are instantly accessible on the top navigation bar; comprehensive tools, settings, and accessibility toggles reside in an accessible slide-out drawer; mobile displays a bottom navigation bar.
6. **Atmospheric, Readable Moving Background**: Slow-drifting radial gradient blobs on 45–90s loops with subtle grain texture. Text is strictly rendered on solid or $\ge 94\%$ opaque surfaces. Features an instant pause toggle and respects `prefers-reduced-motion`.
7. **Human-Crafted Editorial Healthcare Aesthetic**: Hand-crafted typography system (Newsreader serif headers, Public Sans UI, IBM Plex Mono for dosages and IDs), custom SVG icon set, and exact implementations of the *Mint Ice* and *Untitled Blend* palettes.

---

## 🚀 Quick Start (Docker Compose)

The easiest way to run the entire MedBridge stack (PostgreSQL + Next.js App) is with Docker Compose:

```bash
# 1. Clone repository and copy environment configuration
git clone https://github.com/aryav/medsync.git
cd medsync
cp .env.example .env

# 2. Build and start services
docker compose up -d

# 3. Seed demo patient, documents, and users
docker compose exec app npm run seed

# 4. Open in browser
# http://localhost:3000
```

---

## 💻 Local Development Setup (Zero-Docker / VS Code)

MedBridge includes a built-in, zero-config local PostgreSQL 16 engine (`@electric-sql/pglite`) that runs directly in Node.js on `localhost:5432`. You do **not** need Docker Desktop or a manual PostgreSQL installation to run the app locally.

### Prerequisites
- Node.js 18+ (tested on Node.js 20 & 24)

### Quick Start in VS Code
```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (automatically launches local PostgreSQL on 5432 and seeds demo data on first run)
npm run dev
# Visit http://localhost:3000
```

> **Note:** If you want to run the database server independently in its own terminal tab, run:
> ```bash
> npm run db:start
> ```
> And in a second terminal tab:
> ```bash
> npm run dev
> ```

---

## 🐳 Containerized Setup (Docker Compose)

If you prefer to run both PostgreSQL and Next.js entirely inside Docker containers:

```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Build and start services (exposes Next.js on :3000 and PostgreSQL on :5432)
docker compose up -d

# 3. Seed demo patient, documents, and users
docker compose exec app npm run seed

# 4. Open in browser: http://localhost:3000
```

---

## 👥 Demo User Accounts

All demo accounts use the default password: **`Demo@1234`**

| Role | Email | Capabilities |
|---|---|---|
| **Patient** | `patient@demo.test` | View current verified medicines, verbatim doctor instructions, source document links, generate QR handover cards, visual dose schedule. |
| **Clinician** | `clinician@demo.test` | Manage patients, upload visit documents, side-by-side OCR/parser verification, manual entry fallback, cross-visit comparison matrix. |
| **Pharmacist** | `pharmacist@demo.test` | Discrepancy review queue, SLA urgency tracking, side-by-side conflict resolution, approve/reject/escalate discrepancies to promote medicines to `Verified`. |
| **Administrator** | `admin@demo.test` | Real-time egress guard monitoring, cryptographic SHA-256 audit chain verifier, role assignments, synthetic test re-seeding. |

---

## 📋 Synthetic Scenario: Asha R. (`SYN-0042`)

The database is seeded with a 3-visit sequence for **Asha R.** (age 67):

1. **Visit 1 (2026-03-02) — Clinic A (Prescription)**
   - Metformin 500 mg, twice daily after meals
   - Amlodipine 5 mg, once daily morning
   - Atorvastatin 10 mg, at night
   - Pantoprazole 40 mg, once daily before breakfast
2. **Visit 2 (2026-08-14) — City Hospital (Discharge Summary)**
   - Metformin 1000 mg, twice daily
   - Amlodipine 5 mg, once daily morning
   - Atorvastatin 20 mg, at night
   - Aspirin 75 mg, once daily (New)
   *(Pantoprazole omitted)*
3. **Visit 3 (2026-10-20) — Clinic B (Outpatient Note)**
   - Metformin 500 mg, twice daily
   - Amlodipine 5 mg, once daily
   - Atorvastatin 20 mg, at night
   - Aspirin 75 mg, *(instruction unrecorded)*

### Expected 5 Discrepancies (Verified via Automated Tests)
1. **Metformin**: `CONFLICTING_STRENGTH` (**HIGH**) — Conflicting active strengths (500 mg vs 1000 mg) between recent visits.
2. **Pantoprazole**: `MISSING_OR_OUTDATED` (**HIGH**) — Omitted in recent visits without explicit discontinuation.
3. **Atorvastatin**: `STRENGTH_CHANGED` (**MEDIUM**) — Dose changed from 10 mg to 20 mg across encounters.
4. **Aspirin**: `MISSING_INSTRUCTION` (**MEDIUM**) — Strength recorded but instructions omitted or unreadable in Visit 3.
5. **Amlodipine**: `INSTRUCTION_DIFFERS` (**LOW**) — Timing wording nuances between encounter records.

---

## 🛡️ Architecture & Security Features

### 1. Zero Cloud AI Guarantee (Constraint 7)
- **Local Text & Coordinate Extraction**: `pdfjs-dist` extracts text layers and bounding boxes ($x,y,w,h$) in server memory.
- **Local OCR**: Bundled `tesseract.js` worker processes rasterized image uploads without outbound network connectivity.
- **Runtime Egress Guard**: Node.js `fetch` is guarded by `safeFetch`, whitelisting only internal network endpoints (`localhost`, `db`, `ollama`). Outbound attempts are blocked and logged.
- **Content Security Policy**: `default-src 'self'` prevents loading external CDN scripts, styles, or trackers.

### 2. Tamper-Evident SHA-256 Audit Chain
Every database action (document upload, OCR extraction, discrepancy approval, user sign-in, handover card generation) is recorded with SHA-256 cryptographic chaining:
$$\text{hash}_n = \text{SHA-256}(\text{hash}_{n-1} + \text{action} + \text{entity} + \text{actor} + \text{payload} + \text{timestamp})$$
Administrators can run the one-click chain verifier (`/admin`) to confirm that zero records have been altered, deleted, or inserted out of order.

### 3. Clinical Safety Boundary
- Instructions are strictly write-once (`instructionRaw`).
- The system includes `assertNoClinicalAdvice` runtime protection that rejects dangerous phrases such as *"increase dose"*, *"stop taking"*, or *"substitute medicine"*.
- The word "Missing" explicitly indicates unconfirmed continuation, never a recommendation to stop treatment.

### 4. Accessibility (WCAG 2.2 AA)
- Keyboard-only navigation support with skip links, logical focus order, and high-visibility 2px focus rings.
- Geometric severity differentiation (High: Octagon, Medium: Triangle, Low: Circle) so information is never conveyed by color alone.
- One-click **Simple Mode** for distraction-free, motion-free reading.

---

## 🧪 Testing

MedBridge includes a comprehensive unit and integration test suite:

```bash
# Run unit tests (Vitest)
npm test

# Run tests with coverage
npx vitest run --coverage
```

### Test Coverage Highlights
- `tests/unit/discrepancyEngine.test.ts`: Verifies exact detection of all 5 seed discrepancies, deduplication hashes, and reopening rules.
- `tests/unit/auditChain.test.ts`: Verifies SHA-256 hash chaining, genesis block initialization, and detection of simulated database tampering.
- `tests/unit/safety.test.ts`: Verifies `assertNoClinicalAdvice` phrase blocking and missing medication warnings.
- `tests/unit/parser.test.ts`: Verifies exact verbatim substring extraction, drug name normalization, and confidence scores.
- `tests/unit/egressGuard.test.ts`: Verifies external request blocking and internal whitelist conformance.
- `tests/unit/rbac.test.ts`: Verifies role isolation, patient-to-patient boundary protection, and pharmacist-only approval rights.

---

## 📜 License & Compliance Notice

Synthetic clinical data only. For demonstration and research purposes in clinical workflow safety.  
MedBridge does not provide medical advice.
