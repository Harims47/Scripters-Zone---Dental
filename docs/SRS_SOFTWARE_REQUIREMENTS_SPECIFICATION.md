# Software Requirements Specification (SRS)
## DentalCore – Enterprise Dental Clinic Management System
**Application:** DentalCore (Rafi Dental Clinic Edition)  
**Version:** 1.0.0 (Production Release)  
**Status:** Approved & Production-Ready  
**Date:** October 2026  
**Author:** Antigravity Engineering & Clinical Architecture Team  

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the complete software, functional, non-functional, interface, and behavioral requirements for **DentalCore**, an enterprise web-based Dental Clinic Management and Electronic Health Record (EHR) System designed specifically for single- and multi-chair dental healthcare facilities.

### 1.2 Scope of the System
DentalCore replaces fragmented manual paper records, disconnected spreadsheets, and legacy billing systems with a unified, real-time clinical platform. The scope encompasses:
- Patient Onboarding, Digital Registration, Identity Verification & Web-Cam Photo Capture
- Reception Operations, Unified Check-in, Token Generation & Dynamic Waiting Queue
- Doctor Clinical Workspace with Interactive FDI Tooth Charting & Hierarchical Visit Reasons
- Diagnosis, Multi-stage Treatment Planning & Sitting/Session Management
- Prescription Authoring, Stock-aware Pharmacy Dispensing & WhatsApp Rx Sharing
- Invoicing, Multi-tier Payments, Partial Payment Ledgers & Balance Dues
- Drug & Dental Material Inventory Control with Expiry Alerts & Stock Movements
- Staff Administration, Attendance Tracking & Granular Module-Level Access Control (RBAC)
- Clinical & Financial Analytics, Accounting Reports, Excel/PDF Data Exports
- Insurance Reimbursement Documentation & Historical Data Batch Migration

### 1.3 Definitions, Acronyms, and Abbreviations
- **EHR:** Electronic Health Record
- **FDI:** Fédération Dentaire Internationale (Two-digit tooth numbering notation)
- **RBAC:** Role-Based Access Control
- **RCT:** Root Canal Treatment
- **CD / PD:** Complete Denture / Partial Denture
- **PaaS:** Platform as a Service (GoDaddy Airo)
- **JWT:** JSON Web Token
- **AiSensy:** WhatsApp Business Cloud API Gateway

---

## 2. Overall Description

### 2.1 Product Perspective
DentalCore is a client-server web application architected with a decoupled Single Page Application (SPA) frontend and a RESTful backend running on Node.js/Express with Prisma ORM.

```
+-------------------------------------------------------------+
|                      Client Browser                         |
|     React 19 + TypeScript + Tailwind CSS (Vite Engine)     |
+-------------------------------------------------------------+
                              |
                     HTTPS / JSON REST API
                              |
+-------------------------------------------------------------+
|                  DentalCore Express Server                  |
|    Auth / RBAC Middleware  |  Business Logic Controllers    |
|    Queue Runner Worker     |  Document & WhatsApp Generator |
+-------------------------------------------------------------+
                              |
                          Prisma ORM
                              |
+-------------------------------------------------------------+
|                     MySQL 8.0 Database                      |
|       (Local Docker / GoDaddy Airo Cloud Infrastructure)    |
+-------------------------------------------------------------+
```

### 2.2 User Personas & Clinical Roles

| Role | Responsibilities | Access Boundary |
| :--- | :--- | :--- |
| **Head Doctor (Super Admin)** | Chief Dental Surgeon and Clinic Owner. Manages clinical procedures, performs surgeries, sets pricing, approves waivers, oversees financial audit, controls staff permissions. | Full access to all 13 modules, administrative overrides, reports, database tools, and staff management. |
| **Duty Doctor (Associate)** | Attending Dentist. Conducts patient consultations, diagnoses complaints, records treatment sitting notes, issues prescriptions, requests investigations. | Patients, Consultations, Queue, Inventory, Treatments, Reimbursements. **Strictly restricted from Financial Reports, Staff Setup, and Danger Zone settings.** |
| **Receptionist (Front Desk)** | Front-office Executive. Handles patient registrations, collects cash/UPI payments, books appointments, issues queue tokens, dispenses medicines. | Reception Desk, Patients, Queue, Partial Payments, Reimbursements. **Restricted from clinical diagnosis, financial reports, and system settings.** |

---

## 3. Specific Module Requirements

### Module 1: Authentication & Role-Based Access Control (RBAC)
- **SRS-AUTH-01:** System shall authenticate users via username and bcrypt-hashed passwords.
- **SRS-AUTH-02:** Successful authentication shall issue an HTTP-only secure JWT token with a 24-hour expiration window.
- **SRS-AUTH-03:** The system shall enforce the Effective Access Formula:  
  $$\text{Access} = \text{Role Baseline} \cap \text{Custom Module Permissions}$$
- **SRS-AUTH-04:** Rate limiting shall restrict authentication attempts to 10 failed requests per 5 minutes per IP address in production.

### Module 2: Reception Desk & Queue Management
- **SRS-REC-01:** A unified single-page Reception Desk shall coordinate patient search, registration, queue check-in, token assignment, and bill payment.
- **SRS-REC-02:** Real-time queue tracker shall manage token numbers with visual state indicators: `WAITING`, `WITH_DOCTOR`, `READY_FOR_BILLING`, `DISCHARGED`.
- **SRS-REC-03:** Staff shall be able to assign patients to specific doctor room numbers or designate "Emergency / Priority" status.

### Module 3: Patient Information Management
- **SRS-PAT-01:** System shall capture core demographics: Full Name, Age, Gender, Mobile Number, Address, Emergency Contact, and Medical History (Diabetes, Hypertension, Bleeding Disorders, Drug Allergies).
- **SRS-PAT-02:** The system shall integrate a client-side Webcam interface (`react-webcam`) allowing instant capture and upload of patient profile pictures.
- **SRS-PAT-03:** Patient search shall support prefix, substring, and exact matching across Name, Patient ID, and Phone Number.

### Module 4: Doctor Clinical Workspace & FDI Charting
- **SRS-DOC-01:** Interactive adult and pediatric FDI tooth chart allowing clinicians to select individual or multiple teeth (quadrants 1–8).
- **SRS-DOC-02:** Clinicians shall assign standardized hierarchical reasons for visit:
  - 18 Standalone Complaints: General Checkup, Pain, Scaling, Decay, Mobility, Extraction, Sensitivity, Ulcer, Trauma, etc.
  - Multi-stage Procedures: RCT (Opening, Filling, Post, Cutting, Scanning, Fixing), Complete/Partial Dentures, Pulpectomy.
- **SRS-DOC-03:** Clinicians shall record clinical observations, provisional diagnosis, treatment sitting notes, and external specialist advice.

### Module 5: Treatment Planning & Multi-Sitting Management
- **SRS-TRT-01:** System shall support 33 master dental procedures across Surgery, Endodontics, Prosthodontics, Orthodontics, Periodontics, Pedodontics, and Neurological care.
- **SRS-TRT-02:** Multi-sitting procedures shall track progress through sequential clinical sittings: Scheduled $\rightarrow$ In-Progress $\rightarrow$ Completed.
- **SRS-TRT-03:** Automated cost calculation shall aggregate consultation fees, planned procedure variants, and tooth counts into the patient's treatment estimate.

### Module 6: Prescription Authoring & Pharmacy Dispensing
- **SRS-RX-01:** Doctors shall author electronic prescriptions by selecting medications from the integrated 17-item master catalog with dosage, frequency (e.g., 1-0-1), food relation, and duration.
- **SRS-RX-02:** System shall support 1-click automated PDF generation for patient prescriptions including clinic header, FDI tooth notations, doctor signature, and QR verification.
- **SRS-RX-03:** Pharmacy dispensing shall validate available stock levels and automatically deduct dispensed quantities with transactional audit logging (`StockMovement`).
- **SRS-RX-04:** The prescription UI shall disable "Share Rx" and download actions if no prescription has been authored for the visit.

### Module 7: Invoicing, Partial Payments & Ledger
- **SRS-BILL-01:** The system shall automatically aggregate charges from:
  1. Consultation Fees
  2. Completed Treatment Procedures
  3. Dispensed Medications
- **SRS-BILL-02:** System shall support discounts with mandatory reason documentation.
- **SRS-BILL-03:** Multi-tier payment recording supporting Cash, UPI, Credit/Debit Card, and Net Banking.
- **SRS-BILL-04:** Dedicated Partial Payments Ledger shall track unpaid dues, previous balances, and ongoing payment installments per patient.

### Module 8: Inventory & Supplier Management
- **SRS-INV-01:** System shall classify stock into 19 categories across 2 major types:
  - **Medicines:** Tablets, capsules, syrups, injections, gels, mouthwashes.
  - **Clinic Consumables & Materials:** Composites, bonding agents, files, GP points, impressions, gloves, sterilisation pouches.
- **SRS-INV-02:** Automated Low Stock Warnings when stock levels fall below configurable warning thresholds.
- **SRS-INV-03:** Complete inventory audit trail logging adjustments, supplier purchases, and dispensing deductions.

### Module 9: WhatsApp Communication & Notification Engine
- **SRS-COMM-01:** Integration with AiSensy Cloud API for transactional WhatsApp messages.
- **SRS-COMM-02:** Asynchronous message queue runner (`QueueRunner`) processing outbound notifications with retry mechanisms and exponential backoff.
- **SRS-COMM-03:** Support for automated appointment confirmation, 24-hour reminder alerts, and direct document delivery (Prescription / Invoice PDF links).

### Module 10: Reports & Financial Analytics
- **SRS-REP-01:** Daily, weekly, monthly, and custom date range financial summaries (Gross Collections, Discounts, Dues, Net Cash flow).
- **SRS-REP-02:** Department-wise procedure volume statistics and doctor productivity reports.
- **SRS-REP-03:** Instant export of all report grids into standard CSV, Microsoft Excel (`.xlsx`), and PDF formats.

### Module 11: Insurance Reimbursement & Certificates
- **SRS-REIMB-01:** Generation of standardized Medical Attendance Certificates and Fitness Certificates.
- **SRS-REIMB-02:** Preparation of insurance reimbursement dossiers with itemized bills, diagnosis breakdowns, and attached dental imaging (X-rays, clinical photos).

### Module 12: Historical Data Batch Migration
- **SRS-MIG-01:** Secure batch ingestion pipeline for migrating legacy clinic records from Excel/CSV files.
- **SRS-MIG-02:** Pre-import validation engine flagging duplicate phone numbers, malformed dates, and missing names.
- **SRS-MIG-03:** Interactive review and merge interface allowing administrators to approve, edit, or reject batch records before writing to production tables.

### Module 13: System Settings & Clinic Configuration
- **SRS-SET-01:** Centralized clinic profile management (Clinic Name, Tagline, Phone, Email, Address, GSTIN, Registration Number).
- **SRS-SET-02:** Auto-synchronization ensuring all generated documents reflect current clinic branding without code changes.
- **SRS-SET-03:** Protected Database Maintenance & Handover Purge tools allowing complete operational data reset while safeguarding master catalogs and admin accounts.

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements
- **Page Load:** Initial dashboard load under 1.8 seconds on standard 4G broadband.
- **API Response:** 95% of standard CRUD API requests shall respond within 150 milliseconds.
- **PDF Generation:** Server-side PDF synthesis for prescriptions and invoices shall execute in under 400 milliseconds.

### 4.2 Security & Data Protection
- **Password Security:** All passwords hashed using bcrypt with work factor 10.
- **Transport Encryption:** All traffic enforced over TLS 1.3 (HTTPS).
- **SQL Injection Prevention:** 100% parameterization through Prisma ORM query pipeline; zero concatenated SQL queries.
- **CORS:** Restricted strictly to registered clinic origins (`rafidentalclinic.com` and authorized local dev ports).

### 4.3 Reliability & Availability
- **Uptime:** Targeted at 99.9% availability hosted on GoDaddy Airo Cloud container platform.
- **Fail-Closed Principle:** Backend halts startup immediately if essential database or cryptographic environment configurations are invalid or missing.
