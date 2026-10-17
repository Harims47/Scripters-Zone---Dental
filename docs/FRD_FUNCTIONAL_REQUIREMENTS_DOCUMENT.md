# Functional Requirements Document (FRD)
## DentalCore – Enterprise Dental Clinic Management System
**Application:** DentalCore (Rafi Dental Clinic Edition)  
**Version:** 1.0.0 (Production Release)  
**Status:** Approved & Production-Ready  
**Date:** October 2026  
**Author:** Antigravity Engineering & Clinical Architecture Team  

---

## 1. Document Overview & Architectural Context

This Functional Requirements Document (FRD) provides detailed functional specifications, clinical user journeys, data validation constraints, state transitions, and business rules across all locked modules of **DentalCore**.

### System Architecture Summary
- **Frontend:** React 19, TypeScript, Tailwind CSS, Radix UI Primitives, Lucide Icons.
- **Backend:** Node.js, Express 5, TypeScript, Prisma ORM 7.10.
- **Database:** MySQL 8.0 (Active tables: 32).
- **External Interfaces:** AiSensy Cloud Gateway (WhatsApp), PDFKit / pdf-lib (EHR Exports).

---

## 2. Module-Wise Functional Specifications

### Module 1: Patient Information Management (PIM)

#### 1.1 Overview
Allows receptionists and doctors to create, retrieve, search, and update patient demographic profiles, medical histories, and digital portrait photographs.

#### 1.2 Data Elements & Validation Rules

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Required, Min 2, Max 100 chars | Patient Full Name |
| `phone` | String | Required, Regex `^[0-9+ ]{10,15}$` | Mobile Number for WhatsApp communication |
| `age` | Integer | Required, 0 to 125 | Age in years |
| `gender` | Enum | Required (`Male`, `Female`, `Other`) | Biological gender |
| `address` | Text | Optional, Max 500 chars | Residential address |
| `allergies` | String | Optional, Default `None` | Known drug/substance allergies |
| `medicalHistory` | Json / String | Optional | Chronic systemic conditions (Diabetes, BP, Cardiac, Asthma) |
| `photoUrl` | String | Optional, Valid Image URI | Portrait photo captured via webcam or uploaded |

#### 1.3 Workflows & State Machine
1. **Patient Search:** Staff enters name, phone, or ID in search input. System displays instant debounced results (300ms debounce).
2. **Registration:** If patient is not found, "Register New Patient" opens the modal.
3. **Webcam Capture:** User clicks "Take Photo" $\rightarrow$ WebCam stream activates $\rightarrow$ User captures snapshot $\rightarrow$ Base64 image sent to `/api/patients` and saved securely under `/uploads/patient-photos/`.
4. **Duplicate Prevention:** System checks for existing patients with matching phone numbers and warns staff before creating duplicates.

---

### Module 2: Reception Desk & Dynamic Queue Management

#### 2.1 Overview
Acts as the operational heart of front-desk operations, combining patient arrival check-in, token distribution, queue sorting, doctor room routing, and checkout.

#### 2.2 Queue State Transitions

```
[Arrival at Clinic]
         |
         v
    +---------+
    | WAITING |  <--- Token Assigned (e.g. Token #04)
    +---------+
         |
         | (Doctor calls patient / Enters room)
         v
  +---------------+
  |  WITH_DOCTOR  |  <--- Consultation & Treatment Ongoing
  +---------------+
         |
         | (Doctor completes clinical session)
         v
+--------------------+
| READY_FOR_BILLING  |  <--- Front Desk collects fees & dispenses Rx
+--------------------+
         |
         | (Payment settled & documents printed/shared)
         v
   +------------+
   | DISCHARGED |  <--- Visit Completed
   +------------+
```

#### 2.3 Business Rules
- **Token Generation:** Automatically increments per day; resets daily at 00:00 midnight.
- **Priority Override:** Receptionist or Head Doctor can mark a visit as `Priority = true` (emergency/acute pain). Priority tokens automatically bubble to the top of the queue ahead of standard tokens.
- **Doctor Room Assignment:** Staff can route specific patients to Room 1 (Head Doctor), Room 2 (Duty Doctor), or Ortho Bay.

---

### Module 3: Doctor Clinical Workspace & Consultation

#### 3.1 Overview
The digital operating theater for clinicians. Combines complaint capture, adult/pediatric tooth charting, provisional diagnosis, procedure documentation, and specialist referrals.

#### 3.2 Clinical Reason for Visit Catalog (Hierarchical)
Clinicians select from a two-tier standardized catalog:
1. **18 Standalone Clinical Reasons:**
   - General Checkup, Pain, Scaling, Decay, Mobility, Extraction, Missing Teeth, Anterior Filling, Dislodged Filling, Old Fixing, Scan, Ortho, Implant, Trauma, Sensitivity, Ulcer, Flap, Swelling.
2. **4 Multi-Stage Procedure Categories (with 18 Sub-Reasons):**
   - **RCT (Root Canal):** `Opening`, `Filling`, `Post`, `Cutting`, `Scaning`, `Fixing`
   - **CD (Complete Denture):** `Impression/Scan`, `Secondary`, `Bite`, `Trial`, `Delivery`
   - **PD (Partial Denture):** `Impression/Scan`, `Bite`, `Trial`, `Delivery`
   - **Pulpectomy:** `Opening`, `Filling`, `Permanent Filling`
3. **Storage Format:** Stored unified as `"Primary - Sub"` (e.g., `"RCT - Opening"`) with backwards compatibility.

#### 3.3 Interactive FDI Tooth Charting
- Renders an anatomical 32-tooth chart (adults) and 20-tooth chart (pediatric).
- Quadrants:
  - Upper Right (11–18 / 51–55)
  - Upper Left (21–28 / 61–65)
  - Lower Left (31–38 / 71–75)
  - Lower Right (41–48 / 81–85)
- Multi-tooth selection allows linking planned procedures (e.g. Composite Filling on Teeth 16, 17).

---

### Module 4: Treatment Planning & Sitting Management

#### 4.1 Master Clinical Procedure Catalog (33 Procedures)
Preloaded in the system across 7 clinical departments:
1. **Endodontics (6):** Filling, RCT, Permanent Filling, RE RCT, POST & CORE, APICOECTOMY
2. **Prosthodontics (5):** Complete Denture, Removable Partial Denture, Fixed Partial Denture (Metal Ceramic, Zirconia, Acrylic)
3. **Orthodontics (5):** Fixed Appliance (Basic, Self Ligating, Damon), Removable Appliance, Invisalign
4. **Periodontics (4):** Scaling, Curettage, Flap Surgery, Bone Graft
5. **Surgery (7):** Extraction, Impaction, Frenectomy, Splinting, Ankyloglossia, Fixation, Soft Tissue Removal
6. **Pedodontics (3):** Filling, Pulpectomy, Extraction
7. **Neurological Care (3):** Trigeminal Neurologia, MPDS, Facial Palsy

#### 4.2 Sitting & Session Lifecycle
- Each major procedure (such as RCT or Implants) supports multi-session sittings.
- Clinicians track clinical notes, tooth numbers, sitting completion, and rescheduling dates.
- Completed procedures immediately transmit treatment fees into the patient's billing ledger.

---

### Module 5: Electronic Prescriptions & Pharmacy Dispensing

#### 5.1 Prescription Authoring
- Doctors author prescriptions by selecting medicines from the master catalog (17 items) or typing custom drugs.
- Fields: Drug Name, Dosage/Form (Tablet, Gel, Rinse), Frequency (`1-0-1`, `1-1-1`, `0-0-1`), Relation to Food (`Before Food`, `After Food`), Duration (`3 days`, `5 days`, `1 week`), and Special Instructions.
- **UI Guard:** If no prescription is authored for a visit, the **"Share Rx"** and **"Prescription PDF"** buttons are disabled to prevent distributing empty documents.

#### 5.2 Stock-Aware Dispensing
- When the front desk or pharmacy dispenses medication, the system:
  1. Checks real-time stock levels in `Medicine` table.
  2. If sufficient, creates a `Dispensing` and `DispensingItem` record.
  3. Deducts `currentStock` in `Medicine`.
  4. Records a `StockMovement` entry with `type = "DISPENSED"`.
  5. If stock is insufficient, displays an alert allowing partial dispensing or override.

---

### Module 6: Billing, Invoicing & Partial Payments Ledger

#### 6.1 Calculation Logic

$$\text{Gross Amount} = \text{Consultation Fee} + \sum \text{Treatment Fees} + \sum \text{Medicine Fees}$$

$$\text{Net Payable} = \text{Gross Amount} - \text{Discount}$$

$$\text{Outstanding Balance} = \text{Net Payable} - \sum \text{Payments Received}$$

#### 6.2 Partial Payments Ledger
- Patients can pay in installments across multiple visits.
- Every payment records: Date, Amount, Payment Method (`Cash`, `UPI`, `Card`, `NetBanking`), Transaction Ref Number, and Collector Staff ID.
- Receipts display Previous Outstanding, Amount Paid Today, and Remaining Balance.

---

### Module 7: Inventory & Supplier Management

#### 7.1 Master Catalog Structure
- **19 Categories:**
  - *Medicines:* Antibiotic, Anti Inflammatory, Topical, Oral Hygiene, Supplement, Sedative, Injection, Anti Ulcer, PEDO.
  - *Materials:* General Consumables, Prosthodontics, Endodontics, GP POINTS, ENDO FILES, FILLING, Toothbrush, Toothpaste, Ortho Toothpaste, Oral Hygiene Supplements.
- **17 Core Inventory Items:**
  - Complete with stock warning levels (e.g. minimum 5 or 10 units) and unit selling prices.

#### 7.2 Stock Control & Movements
- **Stock Movement Types:** `PURCHASE`, `DISPENSED`, `ADJUSTMENT_ADD`, `ADJUSTMENT_DEDUCT`, `EXPIRED`, `RETURN`.
- Real-time warning badge displayed on sidebar when items fall below `stockWarningLevel`.

---

### Module 8: WhatsApp Cloud Communication Engine

#### 8.1 Integration & Triggers
- Connects to **AiSensy WhatsApp Business Cloud API**.
- **Automated Triggers:**
  - Appointment Booking Confirmation
  - 24-Hour Upcoming Appointment Reminder (scheduled via `QueueRunner`)
  - Direct Prescription Delivery (PDF document message)
  - Payment Invoice & Receipt Delivery

#### 8.2 Reliability & Fallback
- Asynchronous queue runner processes jobs in batches of 10.
- Failed messages undergo 3 exponential backoff retries before logging as `FAILED` in the database.

---

### Module 9: Insurance Reimbursement & Certificates

#### 9.1 Clinical Certificates
- **Medical Attendance Certificate:** Issued with diagnosis, dates of treatment, and rest recommendation.
- **Fitness Certificate:** Issued upon completion of oral rehabilitation or surgery.

#### 9.2 Insurance Reimbursement Packets
- Combines:
  1. Patient Demographics & Treatment Dates
  2. Itemized Treatment Invoices
  3. Pre- and Post-operative Dental X-Ray Images
  4. Treating Doctor Signature & Registration Number
- Generates a consolidated PDF packet for submission to insurance providers.

---

### Module 10: Staff Management & Granular Access Control (RBAC)

#### 10.1 Role Baselines
1. **Head Doctor:** Full access to all 13 modules, database tools, and staff management.
2. **Duty Doctor:** Patients, Appointments, Consultations, Queue, Inventory, Treatments, Reimbursements. (No reports or staff editing).
3. **Receptionist:** Reception Desk, Patients, Queue, Partial Payments, Reimbursements. (No clinical treatment charts or financial reports).

#### 10.2 Custom Module Access
- The Head Doctor can override module access for individual staff members via the Staff Management UI.
- Permissions are stored as a JSON array in `Staff.permissions`.
- Safeguard: Super-admin accounts cannot be locked out of Dashboard or Staff Management.

---

### Module 11: System Settings & Database Maintenance

#### 11.1 Canonical Clinic Profile
- Name: `Rafi Dental Clinic`
- Phone: `9443023648`
- Address: `Dindigul, Tamil Nadu`
- Any updates in Settings immediately synchronize across all PDF headers, WhatsApp templates, and receipts.

#### 11.2 Database Maintenance & Client Handover
- Provides safe one-click reset for handover:
  - Wipes all operational test data (Patients, Visits, Consultations, Invoices, Movements).
  - Preserves all Master Catalogs (19 Categories, 17 Medicines, 33 Treatments).
  - Preserves Doctor user credentials.
