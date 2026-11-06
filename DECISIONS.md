# MedBridge — Architectural & Technical Decisions (`DECISIONS.md`)

This document records the architectural, algorithmic, clinical safety, privacy, and UX decisions made during the design and implementation of MedBridge (Problem Statement 4: *The Forgotten Prescription: Medication Continuity & Safe Handover*).

---

## 1. Zero Cloud AI & Complete Network Isolation (Constraint 7)

### Context & Threat Model
In medication continuity workflows, patient discharge summaries, prescriptions, and physician visit notes contain sensitive health records (PHI). Transmitting these documents to third-party cloud LLMs or OCR services introduces serious compliance risks, potential data leakage, and external supply-chain vulnerabilities.

### Decision
- **Zero Cloud AI**: MedBridge uses strictly local, deterministic, and self-hosted tools. No OpenAI, Anthropic, Google Cloud Vision, or AWS Textract endpoints are contacted.
- **Self-Hosted Assets**: Fonts (Newsreader, Public Sans, IBM Plex Mono) are bundled and served from `/public/fonts`. No Google Fonts or Typekit CDNs are used.
- **Local OCR & PDF Parsing**: `pdfjs-dist` parses text layers in memory, and `tesseract.js` handles image OCR locally.
- **Multi-Layer Egress Guard**:
  1. **Application Layer (`src/lib/egressGuard.ts`)**: `safeFetch` wraps the Node.js runtime fetch. Any outbound request to hosts outside `ALLOWED_INTERNAL_HOSTS` (`localhost`, `db`, `ollama`) is blocked immediately, returning an error and logging an immutable security audit event.
  2. **HTTP Layer (Content Security Policy)**: The root layout and `next.config.mjs` serve strict CSP headers (`default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';`).
  3. **Docker Network Layer**: The PostgreSQL database and application containers run on an internal Docker bridge network (`backend: { internal: true }`).

---

## 2. Extraction Pipeline: Deterministic Rule-Based vs. Cloud LLMs

### Context
Prescription extraction errors can lead to medication errors. A generative LLM can hallucinate medication dosages, standardize brand names incorrectly, or paraphrase instructions.

### Decision
- **Deterministic Regex Parser as Primary (`src/lib/extraction/parser.ts`)**:
  - Regular expressions extract form, drug name, strength, unit, and instructions deterministically.
  - **Substring Invariance**: The extracted `instructionRaw` must be an exact, byte-for-byte substring of the original document line. Paraphrasing is forbidden.
  - **Confidence Scoring**: Each extraction receives a confidence score ($0.0 - 1.0$). If any required field (e.g. strength, instruction) is missing, confidence drops below the threshold (`0.80`), automatically flagging the entry as `Needs review` before confirmation.
- **Coordinate-Aware Line Matching (`src/lib/extraction/pdfText.ts`)**:
  - Every extracted line records its bounding box coordinates ($x, y, w, h$) normalized between $0$ and $1$.
  - In the interactive Source Viewer (`/clinic/documents/[id]`), clicking any field visually highlights the exact source line in the document preview.

---

## 3. Clinical Safety Boundary & Write-Once Immutability

### Context
A healthcare continuity platform must never take clinical decisions away from licensed clinicians and pharmacists.

### Decision
- **No Prescribing or Dosing**: MedBridge explicitly contains no dose calculation, interaction checking, drug-drug contraindication engine, or auto-substitution mechanism.
- **Write-Once Instructions**: `instructionRaw` is populated once during extraction or manual entry. Any clinician correction requires `PATCH /api/entries/:id`, which leaves `instructionRaw` intact, updates `correctedFrom`, and records an audit log.
- **Missing vs. Stopped**: If a medication appears in Visit 1 but is omitted in Visit 2, MedBridge labels it `MISSING_OR_OUTDATED` ("Missing or outdated: Pantoprazole was listed in Clinic A prescription (2026-03-02) but is omitted here. Confirm whether continued, paused, or discontinued."). MedBridge never assumes the medication was deliberately stopped.
- **Runtime Clinical Advice Barrier (`src/lib/safety.ts`)**:
  - `assertNoClinicalAdvice(text)` executes regex checks against forbidden directive phrases (*"increase", "decrease", "reduce the dose", "switch to", "replace with", "substitute", "stop taking", "start taking", "recommended dose", "you should take", "interaction"*).
  - Any model or translation output violating this assertion throws a runtime error.

---

## 4. Deterministic Discrepancy Engine & SLAs

### Context
Patients often receive conflicting prescriptions from different specialists and facilities. Discrepancies must be detected consistently without human bias.

### Decision
- **Normalized Canonical Drug Resolution (`src/lib/normalize.ts`)**:
  - Drug names are matched against a canonical database using exact name matching, alias dictionary matching (e.g., *Glucophage* $\to$ *Metformin*, *Norvasc* $\to$ *Amlodipine*, *Lipitor* $\to$ *Atorvastatin*), and normalized Levenshtein distance $\le 1$ for typos.
- **Six Deterministic Discrepancy Rules (`src/lib/discrepancy/engine.ts`)**:
  1. `CONFLICTING_STRENGTH` (HIGH): Conflicting active strengths within the same visit or between the most recent visits.
  2. `MISSING_OR_OUTDATED` (HIGH): Chronic medication missing from a subsequent hospital discharge or visit note without explanation.
  3. `STRENGTH_CHANGED` (MEDIUM): Dose changed across visits (e.g., Atorvastatin 10 mg $\to$ 20 mg).
  4. `MISSING_INSTRUCTION` (MEDIUM): Medication present with strength but omitted or illegible instructions.
  5. `INSTRUCTION_DIFFERS` (LOW): Differences in timing, food conditions, or schedule.
  6. `FORM_DIFFERS` (LOW): Different dosage forms (e.g., capsule vs. tablet).
- **Deduplication & Reopening Fingerprints**:
  - Discrepancy deduplication uses SHA-256 fingerprints: `sha256(patientId + drugId + rule + sortedVisitIds)`.
  - If a discrepancy was previously approved or rejected, but new document entries change the drug's parameters, the discrepancy is automatically reopened to ensure clinical oversight.
- **SLA Escalation Timers**:
  - High severity: 4 hours.
  - Medium severity: 24 hours.
  - Low severity: 72 hours.
  - Overdue items are prioritized at the top of the pharmacist review queue.

---

## 5. Tamper-Evident SHA-256 Audit Chain (Constraint F11)

### Context
Audit logs in medical software must be legally defensible and tamper-evident to prove that clinical reviews and data accesses were not manipulated.

### Decision
- **Cryptographic Hash Chaining (`src/lib/audit.ts`)**:
  - Every audit log record contains `prevHash` and `hash`.
  - The hash is computed as:
    $$\text{hash} = \text{SHA-256}(\text{prevHash} + \text{action} + \text{entityType} + \text{entityId} + \text{actorId} + \text{canonicalJSON(details)} + \text{timestamp})$$
  - The genesis block is deterministically seeded with `prevHash = "0000000000000000000000000000000000000000000000000000000000000000"`.
- **Integrity Verification UI (`src/components/AdminAuditVerifier.tsx`)**:
  - Administrators can run `POST /api/admin/audit/verify` at any time to verify every link in the hash chain from the genesis block to the head. Any broken hash or out-of-order timestamp is immediately flagged.
- **Role-Based Review Governance**:
  - While clinicians can inspect discrepancies and mark notes, only licensed pharmacists (`PHARMACIST` role) or administrators have permission to perform final discrepancy approval (`APPROVE`), which promotes medications to `Verified` status.

---

## 6. Visual Identity & Accessibility (Constraints 6 & 14)

### Context
Healthcare interfaces must avoid generic templates and ensure universal usability under stress, low vision, and assistive technology.

### Decision
- **Color Palettes**:
  - **Mint Ice (Light Mode)**: Willow Mist (`#F2FDF9`), Young Willow (`#A8F0DC`), Clear Bamboo (`#52CBB0`), Forest Tea (`#147A5F`), Deep Ink (`#0F2A24`).
  - **Untitled Blend (Dark Mode)**: Black Currant (`#12142E`), Clear Hanada (`#4C3894`), Plum Smoke (`#B387E8`), Pale Fuji (`#F6C6E2`).
- **Moving Background (`src/components/BackgroundStage.tsx`)**:
  - Uses 4 drifting radial blobs on slow 45–90 second CSS animation loops with an SVG noise grain filter.
  - **Readability Rule**: All textual content and actionable controls reside exclusively on solid or $\ge 94\%$ opaque surfaces.
  - **Accessibility Controls**: Includes a visible Pause/Play toggle in the top bar. Automatically pauses when `prefers-reduced-motion` is active or when the user switches to Simple Mode. Automatically suspends animation when the browser tab is hidden (`document.visibilityState === "hidden"`).
- **Non-Reliance on Color Alone**:
  - Discrepancy severities use distinct geometric shapes: Octagon for High, Triangle for Medium, Circle for Low.
  - Status badges always include descriptive text labels ("Verified", "Pending professional review", "Needs clarification") alongside icons.
  - Links include persistent underlines.
- **Accessibility Enhancements**:
  - Visible 2px focus ring with 2px offset on all interactive elements.
  - Skip links for main content.
  - ARIA landmark roles, modal focus traps, and full keyboard navigation (Tab, Shift+Tab, Escape, Enter, Space).
  - Simple Mode toggle providing a high-legibility, motion-free view.
