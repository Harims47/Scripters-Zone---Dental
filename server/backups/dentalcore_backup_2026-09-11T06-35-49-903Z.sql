--
-- PostgreSQL database dump
--

\restrict StS4BCzISz6bM1OOPkKd97sPLLHAdE6jIW0eBcd9r6JTI4LMF9GkcPqAG12zRWu

-- Dumped from database version 15.19
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."Visit" DROP CONSTRAINT IF EXISTS "Visit_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public."Visit" DROP CONSTRAINT IF EXISTS "Visit_appointmentId_fkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_staffId_fkey";
ALTER TABLE IF EXISTS ONLY public."TreatmentPlan" DROP CONSTRAINT IF EXISTS "TreatmentPlan_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public."TreatmentPlanItem" DROP CONSTRAINT IF EXISTS "TreatmentPlanItem_treatmentPlanId_fkey";
ALTER TABLE IF EXISTS ONLY public."TreatmentPlanItem" DROP CONSTRAINT IF EXISTS "TreatmentPlanItem_treatmentCatalogId_fkey";
ALTER TABLE IF EXISTS ONLY public."TreatmentPlanItem" DROP CONSTRAINT IF EXISTS "TreatmentPlanItem_completedVisitId_fkey";
ALTER TABLE IF EXISTS ONLY public."SupplierPayment" DROP CONSTRAINT IF EXISTS "SupplierPayment_supplierBillId_fkey";
ALTER TABLE IF EXISTS ONLY public."SupplierMedicineCategory" DROP CONSTRAINT IF EXISTS "SupplierMedicineCategory_supplierId_fkey";
ALTER TABLE IF EXISTS ONLY public."SupplierMedicineCategory" DROP CONSTRAINT IF EXISTS "SupplierMedicineCategory_medicineCategoryId_fkey";
ALTER TABLE IF EXISTS ONLY public."SupplierBill" DROP CONSTRAINT IF EXISTS "SupplierBill_supplierId_fkey";
ALTER TABLE IF EXISTS ONLY public."SupplierBill" DROP CONSTRAINT IF EXISTS "SupplierBill_purchaseOrderId_fkey";
ALTER TABLE IF EXISTS ONLY public."StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_medicineId_fkey";
ALTER TABLE IF EXISTS ONLY public."QueueEntry" DROP CONSTRAINT IF EXISTS "QueueEntry_visitId_fkey";
ALTER TABLE IF EXISTS ONLY public."PurchaseOrder" DROP CONSTRAINT IF EXISTS "PurchaseOrder_supplierId_fkey";
ALTER TABLE IF EXISTS ONLY public."PurchaseOrderItem" DROP CONSTRAINT IF EXISTS "PurchaseOrderItem_purchaseOrderId_fkey";
ALTER TABLE IF EXISTS ONLY public."PurchaseOrderItem" DROP CONSTRAINT IF EXISTS "PurchaseOrderItem_medicineId_fkey";
ALTER TABLE IF EXISTS ONLY public."Prescription" DROP CONSTRAINT IF EXISTS "Prescription_visitId_fkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionItem" DROP CONSTRAINT IF EXISTS "PrescriptionItem_prescriptionId_fkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionItem" DROP CONSTRAINT IF EXISTS "PrescriptionItem_medicineId_fkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_visitId_fkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_patientId_fkey";
ALTER TABLE IF EXISTS ONLY public."Medicine" DROP CONSTRAINT IF EXISTS "Medicine_categoryId_fkey";
ALTER TABLE IF EXISTS ONLY public."Dispensing" DROP CONSTRAINT IF EXISTS "Dispensing_visitId_fkey";
ALTER TABLE IF EXISTS ONLY public."Dispensing" DROP CONSTRAINT IF EXISTS "Dispensing_prescriptionId_fkey";
ALTER TABLE IF EXISTS ONLY public."DispensingItem" DROP CONSTRAINT IF EXISTS "DispensingItem_medicineId_fkey";
ALTER TABLE IF EXISTS ONLY public."DispensingItem" DROP CONSTRAINT IF EXISTS "DispensingItem_dispensingId_fkey";
ALTER TABLE IF EXISTS ONLY public."Consultation" DROP CONSTRAINT IF EXISTS "Consultation_visitId_fkey";
DROP INDEX IF EXISTS public."Visit_appointmentId_key";
DROP INDEX IF EXISTS public."User_username_key";
DROP INDEX IF EXISTS public."User_staffId_key";
DROP INDEX IF EXISTS public."TreatmentPlan_patientId_key";
DROP INDEX IF EXISTS public."SupplierMedicineCategory_supplierId_medicineCategoryId_key";
DROP INDEX IF EXISTS public."QueueEntry_visitId_key";
DROP INDEX IF EXISTS public."PurchaseOrder_orderNumber_key";
DROP INDEX IF EXISTS public."Prescription_visitId_key";
DROP INDEX IF EXISTS public."Patient_phone_key";
DROP INDEX IF EXISTS public."MedicineCategory_name_key";
DROP INDEX IF EXISTS public."Dispensing_visitId_key";
DROP INDEX IF EXISTS public."Dispensing_prescriptionId_key";
DROP INDEX IF EXISTS public."Consultation_visitId_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."Visit" DROP CONSTRAINT IF EXISTS "Visit_pkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."TreatmentPlan" DROP CONSTRAINT IF EXISTS "TreatmentPlan_pkey";
ALTER TABLE IF EXISTS ONLY public."TreatmentPlanItem" DROP CONSTRAINT IF EXISTS "TreatmentPlanItem_pkey";
ALTER TABLE IF EXISTS ONLY public."TreatmentCatalog" DROP CONSTRAINT IF EXISTS "TreatmentCatalog_pkey";
ALTER TABLE IF EXISTS ONLY public."Supplier" DROP CONSTRAINT IF EXISTS "Supplier_pkey";
ALTER TABLE IF EXISTS ONLY public."SupplierPayment" DROP CONSTRAINT IF EXISTS "SupplierPayment_pkey";
ALTER TABLE IF EXISTS ONLY public."SupplierMedicineCategory" DROP CONSTRAINT IF EXISTS "SupplierMedicineCategory_pkey";
ALTER TABLE IF EXISTS ONLY public."SupplierBill" DROP CONSTRAINT IF EXISTS "SupplierBill_pkey";
ALTER TABLE IF EXISTS ONLY public."StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_pkey";
ALTER TABLE IF EXISTS ONLY public."Staff" DROP CONSTRAINT IF EXISTS "Staff_pkey";
ALTER TABLE IF EXISTS ONLY public."QueueEntry" DROP CONSTRAINT IF EXISTS "QueueEntry_pkey";
ALTER TABLE IF EXISTS ONLY public."PurchaseOrder" DROP CONSTRAINT IF EXISTS "PurchaseOrder_pkey";
ALTER TABLE IF EXISTS ONLY public."PurchaseOrderItem" DROP CONSTRAINT IF EXISTS "PurchaseOrderItem_pkey";
ALTER TABLE IF EXISTS ONLY public."Prescription" DROP CONSTRAINT IF EXISTS "Prescription_pkey";
ALTER TABLE IF EXISTS ONLY public."PrescriptionItem" DROP CONSTRAINT IF EXISTS "PrescriptionItem_pkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_pkey";
ALTER TABLE IF EXISTS ONLY public."Patient" DROP CONSTRAINT IF EXISTS "Patient_pkey";
ALTER TABLE IF EXISTS ONLY public."Medicine" DROP CONSTRAINT IF EXISTS "Medicine_pkey";
ALTER TABLE IF EXISTS ONLY public."MedicineCategory" DROP CONSTRAINT IF EXISTS "MedicineCategory_pkey";
ALTER TABLE IF EXISTS ONLY public."Dispensing" DROP CONSTRAINT IF EXISTS "Dispensing_pkey";
ALTER TABLE IF EXISTS ONLY public."DispensingItem" DROP CONSTRAINT IF EXISTS "DispensingItem_pkey";
ALTER TABLE IF EXISTS ONLY public."Consultation" DROP CONSTRAINT IF EXISTS "Consultation_pkey";
ALTER TABLE IF EXISTS ONLY public."Appointment" DROP CONSTRAINT IF EXISTS "Appointment_pkey";
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."Visit";
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."TreatmentPlanItem";
DROP TABLE IF EXISTS public."TreatmentPlan";
DROP TABLE IF EXISTS public."TreatmentCatalog";
DROP TABLE IF EXISTS public."SupplierPayment";
DROP TABLE IF EXISTS public."SupplierMedicineCategory";
DROP TABLE IF EXISTS public."SupplierBill";
DROP TABLE IF EXISTS public."Supplier";
DROP TABLE IF EXISTS public."StockMovement";
DROP TABLE IF EXISTS public."Staff";
DROP TABLE IF EXISTS public."QueueEntry";
DROP TABLE IF EXISTS public."PurchaseOrderItem";
DROP TABLE IF EXISTS public."PurchaseOrder";
DROP TABLE IF EXISTS public."PrescriptionItem";
DROP TABLE IF EXISTS public."Prescription";
DROP TABLE IF EXISTS public."Payment";
DROP TABLE IF EXISTS public."Patient";
DROP TABLE IF EXISTS public."MedicineCategory";
DROP TABLE IF EXISTS public."Medicine";
DROP TABLE IF EXISTS public."DispensingItem";
DROP TABLE IF EXISTS public."Dispensing";
DROP TABLE IF EXISTS public."Consultation";
DROP TABLE IF EXISTS public."Appointment";
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: dental
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO dental;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: dental
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Appointment; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Appointment" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "providerId" text,
    date text NOT NULL,
    "time" text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'Scheduled'::text NOT NULL,
    notes text,
    "photoUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Appointment" OWNER TO dental;

--
-- Name: Consultation; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Consultation" (
    id text NOT NULL,
    "visitId" text NOT NULL,
    "doctorId" text NOT NULL,
    "reasonForVisit" text NOT NULL,
    "clinicalNotes" text NOT NULL,
    "consultationFee" double precision NOT NULL,
    "treatmentFee" double precision,
    status text DEFAULT 'In Progress'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Consultation" OWNER TO dental;

--
-- Name: Dispensing; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Dispensing" (
    id text NOT NULL,
    "visitId" text NOT NULL,
    "prescriptionId" text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Dispensing" OWNER TO dental;

--
-- Name: DispensingItem; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."DispensingItem" (
    id text NOT NULL,
    "dispensingId" text NOT NULL,
    "medicineId" text NOT NULL,
    "prescribedQuantity" integer NOT NULL,
    "dispensedQuantity" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DispensingItem" OWNER TO dental;

--
-- Name: Medicine; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Medicine" (
    id text NOT NULL,
    name text NOT NULL,
    "genericName" text,
    "categoryId" text NOT NULL,
    form text NOT NULL,
    unit text NOT NULL,
    "stockWarningLevel" integer NOT NULL,
    "currentStock" integer DEFAULT 0 NOT NULL,
    "unitPrice" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL
);


ALTER TABLE public."Medicine" OWNER TO dental;

--
-- Name: MedicineCategory; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."MedicineCategory" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'Active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MedicineCategory" OWNER TO dental;

--
-- Name: Patient; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Patient" (
    id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    age integer NOT NULL,
    gender text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    "photoUrl" text,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Patient" OWNER TO dental;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "visitId" text NOT NULL,
    "patientId" text NOT NULL,
    amount double precision NOT NULL,
    method text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    notes text,
    date text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payment" OWNER TO dental;

--
-- Name: Prescription; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Prescription" (
    id text NOT NULL,
    "visitId" text NOT NULL,
    "doctorId" text NOT NULL,
    status text DEFAULT 'Draft'::text NOT NULL,
    notes text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Prescription" OWNER TO dental;

--
-- Name: PrescriptionItem; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."PrescriptionItem" (
    id text NOT NULL,
    "prescriptionId" text NOT NULL,
    "medicineId" text NOT NULL,
    quantity integer NOT NULL,
    dosage text,
    frequency text,
    duration text,
    instructions text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PrescriptionItem" OWNER TO dental;

--
-- Name: PurchaseOrder; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."PurchaseOrder" (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    "supplierId" text NOT NULL,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'Draft'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PurchaseOrder" OWNER TO dental;

--
-- Name: PurchaseOrderItem; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."PurchaseOrderItem" (
    id text NOT NULL,
    "purchaseOrderId" text NOT NULL,
    "medicineId" text NOT NULL,
    "orderedQuantity" integer NOT NULL,
    "receivedQuantity" integer DEFAULT 0 NOT NULL,
    "unitCost" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PurchaseOrderItem" OWNER TO dental;

--
-- Name: QueueEntry; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."QueueEntry" (
    id text NOT NULL,
    "visitId" text NOT NULL,
    "patientId" text NOT NULL,
    "assignedDoctorId" text,
    "position" integer NOT NULL,
    status text NOT NULL,
    priority boolean DEFAULT false NOT NULL,
    "arrivalTime" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."QueueEntry" OWNER TO dental;

--
-- Name: Staff; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Staff" (
    id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    attendance text DEFAULT 'Present'::text NOT NULL,
    "roomNumber" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Staff" OWNER TO dental;

--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."StockMovement" (
    id text NOT NULL,
    "medicineId" text NOT NULL,
    "movementType" text NOT NULL,
    quantity integer NOT NULL,
    "balanceAfter" integer NOT NULL,
    "referenceType" text,
    "referenceId" text,
    reason text,
    "performedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StockMovement" OWNER TO dental;

--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    name text NOT NULL,
    "contactPerson" text,
    phone text,
    email text,
    address text,
    status text DEFAULT 'Active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Supplier" OWNER TO dental;

--
-- Name: SupplierBill; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."SupplierBill" (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    "purchaseOrderId" text,
    "invoiceNumber" text NOT NULL,
    "invoiceDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    amount double precision NOT NULL,
    notes text,
    status text DEFAULT 'Unpaid'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "billImageUrl" text
);


ALTER TABLE public."SupplierBill" OWNER TO dental;

--
-- Name: SupplierMedicineCategory; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."SupplierMedicineCategory" (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    "medicineCategoryId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SupplierMedicineCategory" OWNER TO dental;

--
-- Name: SupplierPayment; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."SupplierPayment" (
    id text NOT NULL,
    "supplierBillId" text NOT NULL,
    amount double precision NOT NULL,
    method text NOT NULL,
    notes text,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SupplierPayment" OWNER TO dental;

--
-- Name: TreatmentCatalog; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."TreatmentCatalog" (
    id text NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    variant text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TreatmentCatalog" OWNER TO dental;

--
-- Name: TreatmentPlan; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."TreatmentPlan" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TreatmentPlan" OWNER TO dental;

--
-- Name: TreatmentPlanItem; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."TreatmentPlanItem" (
    id text NOT NULL,
    "treatmentPlanId" text NOT NULL,
    "treatmentCatalogId" text NOT NULL,
    status text DEFAULT 'Planned'::text NOT NULL,
    notes text,
    "completedVisitId" text,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TreatmentPlanItem" OWNER TO dental;

--
-- Name: User; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    "passwordHash" text NOT NULL,
    role text NOT NULL,
    "staffId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO dental;

--
-- Name: Visit; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public."Visit" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text,
    "appointmentId" text,
    status text NOT NULL,
    "amountDue" double precision DEFAULT 0 NOT NULL,
    "consultationFee" double precision,
    "treatmentFee" double precision,
    "medicineCost" double precision,
    "reasonForVisit" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Visit" OWNER TO dental;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: dental
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO dental;

--
-- Data for Name: Appointment; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Appointment" (id, "patientId", "providerId", date, "time", type, status, notes, "photoUrl", "createdAt", "updatedAt") FROM stdin;
6dd17c5e-d470-400d-9475-8b95b063cd05	c75f0db0-aa4e-4d1f-a380-730b50599694	\N	2026-09-10	10:00	Cleaning	Checked In	test	\N	2026-09-10 16:52:04.143	2026-09-10 16:52:04.306
b79cc378-6882-41a3-98c8-eb0a45cc6f90	b42ebfea-4165-4a60-b0a4-f032ca096c5f	\N	2026-09-11	09:00	Toothache	Scheduled	[Transferred - Token #1] Clinic closing / High waiting time	\N	2026-09-10 17:03:59.903	2026-09-10 17:03:59.903
\.


--
-- Data for Name: Consultation; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Consultation" (id, "visitId", "doctorId", "reasonForVisit", "clinicalNotes", "consultationFee", "treatmentFee", status, "createdAt", "updatedAt") FROM stdin;
8bf94d50-08f1-405e-b6a8-3e88e01f9179	3e4a428a-6bd0-4cf2-b3aa-e41c5db7feff	66b9ace7-2946-495b-9d31-235628f64a25	Toothache	Routine Examination	500	4590	Completed	2026-09-10 16:59:34.268	2026-09-10 17:00:10.198
5d38ce02-ae57-449f-b04f-66b626b9e8ee	d210dcef-c0c1-4852-ae06-01c99f584d83	81033cf6-ca0e-4138-af43-7b7c2e414254	General Consultation	Patient reports moderate toothache. Advised hygiene and analgesics.	500	0	Completed	2026-09-11 04:43:55.93	2026-09-11 04:43:57.58
ba68f28c-e3f9-4bfd-ad63-518eca71b675	a4c08a25-1f94-43ad-b2a2-c02c5d0b65ed	81033cf6-ca0e-4138-af43-7b7c2e414254	General Consultation	Patient reports moderate toothache. Advised hygiene and analgesics.	500	0	Completed	2026-09-11 04:45:23.895	2026-09-11 04:45:25.397
d30cd0cb-788d-4e1a-986d-06bcd5f670a8	51bec9f1-9305-42b8-8098-fde8ffa08330	81033cf6-ca0e-4138-af43-7b7c2e414254	Tooth Pain	Check concurrency race	500	0	Completed	2026-09-11 04:57:06.245	2026-09-11 04:57:06.266
1c3aa902-838a-458c-8cc6-15b673ae322c	1763e5cf-5e25-4315-9926-90c37a622597	81033cf6-ca0e-4138-af43-7b7c2e414254	Root Canal	First stage completed	500	1200	Completed	2026-09-11 04:57:42.56	2026-09-11 04:57:42.592
a2f74b80-c2c7-4255-9b75-9390ff43897c	6974b354-8083-410c-b59b-4c9e95d745d6	81033cf6-ca0e-4138-af43-7b7c2e414254	Cleaning	Scaling done	500	500	Completed	2026-09-11 04:57:43.799	2026-09-11 04:57:43.82
eefd0bba-d832-4fcb-b35d-6d3b48a8bc80	e783c34f-9b06-4568-8ac8-1728b7ea3121	81033cf6-ca0e-4138-af43-7b7c2e414254	Pre-cancellation audit	Examined before cancellation test	300	0	Completed	2026-09-11 05:02:30.605	2026-09-11 05:02:30.643
55da5a5f-e3a8-4626-a155-293c040b47f5	d2ac6adb-f65a-45a7-be7f-df0d8f7f0e35	81033cf6-ca0e-4138-af43-7b7c2e414254	General Consultation	Patient reports moderate toothache. Advised hygiene and analgesics.	500	0	Completed	2026-09-11 05:04:47.48	2026-09-11 05:04:49.142
65833db3-9a81-43ac-af07-d0349dd4cf30	3b377652-72ba-4234-ba0a-afd82da9df6e	81033cf6-ca0e-4138-af43-7b7c2e414254	Root Canal	First stage completed	500	1200	Completed	2026-09-11 04:58:20.362	2026-09-11 04:58:20.389
ffef3587-18b9-4174-b5cb-20d49e167cfd	bd2d42a4-b267-407b-968d-365a1a12d60c	81033cf6-ca0e-4138-af43-7b7c2e414254	Cleaning	Scaling done	500	500	Completed	2026-09-11 04:58:20.906	2026-09-11 04:58:20.928
e81b27f7-8a20-4ce5-ab04-74cff1e7d8d7	1f774e84-8b65-44dc-80be-1cff48700244	81033cf6-ca0e-4138-af43-7b7c2e414254	Consultation and Plan	Examined, treatment planned	400	0	Completed	2026-09-11 05:00:45.905	2026-09-11 05:00:45.958
4d6ae117-7df9-4ae6-9d4b-0225c96e131e	fd6ff133-c11f-4bce-9025-9334f4a7dac3	81033cf6-ca0e-4138-af43-7b7c2e414254	Pre-cancellation audit	Examined before cancellation test	300	0	Completed	2026-09-11 05:02:04.738	2026-09-11 05:02:04.784
c14a3616-53fb-402e-ad20-de8f0144fb15	ab25bcb2-ae80-41c5-b3a5-f1089e665b32	81033cf6-ca0e-4138-af43-7b7c2e414254	Tooth Pain	Check concurrency race	500	0	Completed	2026-09-11 05:07:29.42	2026-09-11 05:07:29.44
8c35b1c4-30f8-4b3c-bbdb-94911320dd65	21e3c118-7843-4b33-b823-82b334b614a0	81033cf6-ca0e-4138-af43-7b7c2e414254	Root Canal	First stage completed	500	1200	Completed	2026-09-11 05:07:37.791	2026-09-11 05:07:37.817
a5220811-4f6f-4445-bdc6-5b1e09d82347	d45fe62e-0cfe-4601-8733-45e422c6ca86	81033cf6-ca0e-4138-af43-7b7c2e414254	Cleaning	Scaling done	500	500	Completed	2026-09-11 05:07:38.291	2026-09-11 05:07:38.321
95c7f29a-8f20-4ac3-8098-f2e44b9e8f73	7459a9fb-550b-45bb-8b61-4a49c038e974	81033cf6-ca0e-4138-af43-7b7c2e414254	Consultation and Plan	Examined, treatment planned	400	0	Completed	2026-09-11 05:07:58.499	2026-09-11 05:07:58.535
46968254-8ffd-4e9c-ae6b-d342d8ca1f45	c29c0802-0248-4dfa-8cc1-7bf692d4ccf9	81033cf6-ca0e-4138-af43-7b7c2e414254	Pre-cancellation audit	Examined before cancellation test	300	0	Completed	2026-09-11 05:08:06.879	2026-09-11 05:08:06.901
6dce9c49-87a2-4b71-8c61-7f24b9fb4358	95b0d234-093e-4d24-ad4f-ec6bdbca3a67	81033cf6-ca0e-4138-af43-7b7c2e414254	General Consultation	Patient reports moderate toothache. Advised hygiene and analgesics.	500	0	Completed	2026-09-11 06:07:45.065	2026-09-11 06:07:46.627
a09ef947-0b18-47cc-9938-12977cefb3cf	6c72b8a4-2aa3-4023-9767-e54e489b069c	81033cf6-ca0e-4138-af43-7b7c2e414254	Root Canal	First stage completed	500	1200	Completed	2026-09-11 06:10:35.276	2026-09-11 06:10:35.31
00747a34-fbd6-455f-b972-2df031160287	26e8333c-2f09-4863-a9da-a69f43272a69	81033cf6-ca0e-4138-af43-7b7c2e414254	Cleaning	Scaling done	500	500	Completed	2026-09-11 06:10:35.835	2026-09-11 06:10:35.857
ac5f344b-188b-4238-9fae-066c82c1a2a4	8519c1de-5fe2-4c0e-9ad0-0aeaf8c71c70	81033cf6-ca0e-4138-af43-7b7c2e414254	Consultation and Plan	Examined, treatment planned	400	0	Completed	2026-09-11 06:10:52.837	2026-09-11 06:10:52.858
\.


--
-- Data for Name: Dispensing; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Dispensing" (id, "visitId", "prescriptionId", status, "createdAt", "updatedAt") FROM stdin;
2749df3f-905b-43cf-9150-ef95b40ae50a	3e4a428a-6bd0-4cf2-b3aa-e41c5db7feff	be331405-24d1-44da-9dec-0abd272bc051	Completed	2026-09-10 17:00:38.528	2026-09-10 17:00:38.528
dd518b5f-d12b-4879-aac7-e0549f2f37e4	d210dcef-c0c1-4852-ae06-01c99f584d83	260dfc67-2c9e-43b2-ab24-599d16c523a1	Completed	2026-09-11 04:44:08.488	2026-09-11 04:44:08.488
19ec21d9-b91d-4f42-9538-cef91e58df62	a4c08a25-1f94-43ad-b2a2-c02c5d0b65ed	03dce619-72a3-4ae5-9e5f-76d447a4fe45	Completed	2026-09-11 04:45:36.133	2026-09-11 04:45:36.133
3cd473fe-7dcf-47bf-9284-110567fc4037	d2ac6adb-f65a-45a7-be7f-df0d8f7f0e35	67029638-a137-4aff-b86d-ebb47e2c5e2c	Completed	2026-09-11 05:05:01.005	2026-09-11 05:05:01.005
5cd23963-bae6-4ed5-a99b-1615feb706af	95b0d234-093e-4d24-ad4f-ec6bdbca3a67	de674188-229e-4a65-b8db-e6219c09cd48	Completed	2026-09-11 06:07:57.865	2026-09-11 06:07:57.865
\.


--
-- Data for Name: DispensingItem; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."DispensingItem" (id, "dispensingId", "medicineId", "prescribedQuantity", "dispensedQuantity", "createdAt", "updatedAt") FROM stdin;
88a845ca-d98b-4726-9104-4a57f11e46a5	2749df3f-905b-43cf-9150-ef95b40ae50a	595b0d93-19d1-4bdb-82f6-5e386853876d	5	4	2026-09-10 17:00:38.528	2026-09-10 17:00:38.528
e9fadd41-cac1-4059-b26f-27b5cc97ebb9	dd518b5f-d12b-4879-aac7-e0549f2f37e4	595b0d93-19d1-4bdb-82f6-5e386853876d	1	1	2026-09-11 04:44:08.488	2026-09-11 04:44:08.488
fbe1d810-8580-4b73-b402-1dcc203c0e68	19ec21d9-b91d-4f42-9538-cef91e58df62	595b0d93-19d1-4bdb-82f6-5e386853876d	1	1	2026-09-11 04:45:36.133	2026-09-11 04:45:36.133
cfac67ea-9878-4215-9ce2-29614faf2ca5	3cd473fe-7dcf-47bf-9284-110567fc4037	be5b392a-6891-4ce6-9c4b-22773ff93217	1	1	2026-09-11 05:05:01.005	2026-09-11 05:05:01.005
71523f11-47bc-4a82-84b4-597893107ba3	5cd23963-bae6-4ed5-a99b-1615feb706af	be5b392a-6891-4ce6-9c4b-22773ff93217	1	1	2026-09-11 06:07:57.865	2026-09-11 06:07:57.865
\.


--
-- Data for Name: Medicine; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Medicine" (id, name, "genericName", "categoryId", form, unit, "stockWarningLevel", "currentStock", "unitPrice", "createdAt", "updatedAt", status) FROM stdin;
595b0d93-19d1-4bdb-82f6-5e386853876d	Tablet 1		6523362e-8b1c-4d8a-a992-17cd5d8f8b88	Tablet	MG	10	194	80	2026-09-10 16:14:16.531	2026-09-11 04:45:36.123	Active
2d10756c-c150-423a-b177-2d5c44f7485c	QA-R2-Medicine-LowStock	QA Low Stock Test	ac489fd3-796e-4372-9791-f7ca3168ce65	Tablet	Strip	10	3	25	2026-09-11 04:48:26.504	2026-09-11 04:48:26.504	Active
eb4f78eb-31f5-4e3c-afe3-56271fb48ea2	QA-Boundary-Med-1789102760972	QA Test Generic	ac489fd3-796e-4372-9791-f7ca3168ce65	Tablet	Strip	10	0	25	2026-09-11 04:59:20.978	2026-09-11 04:59:21.045	Active
3eaa4ec5-fe90-473d-90c6-ae3bd2ff59b5	QA-DeleteSafety-1789102761179	Safety Check	ac489fd3-796e-4372-9791-f7ca3168ce65	Syrup	Bottle	5	0	50	2026-09-11 04:59:21.186	2026-09-11 04:59:21.186	Active
180273a4-b0fd-4c6b-8f01-14a5814f0456	QA-Boundary-Med-1789102791684	QA Test Generic	ac489fd3-796e-4372-9791-f7ca3168ce65	Tablet	Strip	10	0	25	2026-09-11 04:59:51.696	2026-09-11 04:59:51.762	Active
2682ee90-fb77-467b-b92c-86aa9bca8ebd	QA-DeleteSafety-1789102791897	Safety Check	ac489fd3-796e-4372-9791-f7ca3168ce65	Syrup	Bottle	5	0	50	2026-09-11 04:59:51.908	2026-09-11 04:59:51.962	Active
a08c7054-e4a5-4a1d-82f9-96a04877e677	QA-Boundary-Med-1789103266918	QA Test Generic	ac489fd3-796e-4372-9791-f7ca3168ce65	Tablet	Strip	10	0	25	2026-09-11 05:07:46.928	2026-09-11 05:07:46.995	Active
0c520c40-ebf1-4d96-bc1e-17a4a20f0adf	QA-DeleteSafety-1789103267155	Safety Check	ac489fd3-796e-4372-9791-f7ca3168ce65	Syrup	Bottle	5	0	50	2026-09-11 05:07:47.165	2026-09-11 05:07:47.217	Active
be5b392a-6891-4ce6-9c4b-22773ff93217	QA-Boundary-Med-1789102727576	QA Test Generic	ac489fd3-796e-4372-9791-f7ca3168ce65	Tablet	Strip	10	66	25	2026-09-11 04:58:47.582	2026-09-11 06:10:44.3	Active
ab12b663-020b-4099-a486-8bf9050a15c3	QA-Boundary-Med-1789107044472	QA Test Generic	ac489fd3-796e-4372-9791-f7ca3168ce65	Tablet	Strip	10	0	25	2026-09-11 06:10:44.483	2026-09-11 06:10:44.547	Active
d2482820-7619-434c-b1ea-d8ea6918be77	QA-DeleteSafety-1789107044667	Safety Check	ac489fd3-796e-4372-9791-f7ca3168ce65	Syrup	Bottle	5	0	50	2026-09-11 06:10:44.675	2026-09-11 06:10:44.733	Active
\.


--
-- Data for Name: MedicineCategory; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."MedicineCategory" (id, name, description, status, "createdAt", "updatedAt") FROM stdin;
ac489fd3-796e-4372-9791-f7ca3168ce65	Category 1	Category 1	Active	2026-09-10 16:12:49.755	2026-09-10 16:12:49.755
6523362e-8b1c-4d8a-a992-17cd5d8f8b88	Category 2	Category 2.2	Active	2026-09-10 16:13:01.994	2026-09-10 16:13:10.812
9ba985e3-92c2-4f1b-82d8-54abb916cfbf	Category 3	Category 3	Active	2026-09-10 16:13:25.21	2026-09-10 16:13:25.21
\.


--
-- Data for Name: Patient; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Patient" (id, name, phone, age, gender, status, "photoUrl", address, "createdAt", "updatedAt") FROM stdin;
1b4455bc-9405-44a8-8b5b-88e9660e0a83	Harinarayanan A	8248305219	28	Male	Active	data:image/jpeg;base64,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	No 1, Ruba nagar, sundakkamuthur	2026-09-10 16:51:42.778	2026-09-10 16:51:42.778
c75f0db0-aa4e-4d1f-a380-730b50599694	Sujitha	5746756567	26	Male	Active		No 1, Ruba nagar , Sundakkamuthur	2026-09-10 16:52:04.087	2026-09-10 16:52:04.087
b42ebfea-4165-4a60-b0a4-f032ca096c5f	yokesh	3424242342	36	Male	Active		test	2026-09-10 16:56:45.296	2026-09-10 16:56:45.296
1b8314c0-ce8a-4fba-aef2-fda7f8fa5516	QA_Cancel_1789101747279	9943959505	25	Male	Active			2026-09-11 04:42:34.843	2026-09-11 04:42:34.843
9a051b02-a36a-410b-991f-cd2a40bb3590	PW_TestPatient_1789101771458	9202049687	45	Male	Active			2026-09-11 04:42:58.767	2026-09-11 04:42:58.767
1b7c239f-02c0-414c-aa46-fb211b3ed7e4	PW_TestPatient_1789101811727	9750690381	45	Male	Active			2026-09-11 04:43:39.15	2026-09-11 04:43:39.15
e9a1dbef-e0ac-46eb-ab3c-999997beca59	PW_TestPatient_1789101899483	9983634135	45	Male	Active			2026-09-11 04:45:06.804	2026-09-11 04:45:06.804
0dbdf4cb-844c-42e5-9e8e-ced6df9d734c	PW_ErrorTest_1789101963951	9594385851	30	Male	Active			2026-09-11 04:46:16.227	2026-09-11 04:46:16.227
73c365ff-12db-41d5-a0e2-04b47b448550	QA-CONC-Patient-1789102423130	9834451175	30	Male	Active	\N	\N	2026-09-11 04:53:43.139	2026-09-11 04:53:43.139
3ecef4ed-2ee5-4385-ab99-3a69d94b6c59	QA-CONC-Assign-1789102424385	9870096712	28	Female	Active	\N	\N	2026-09-11 04:53:44.393	2026-09-11 04:53:44.393
d57dd7ff-cd1e-499a-92fc-ad82f71dcaf2	QA-CONC-Patient-1789102459754	9835105171	30	Male	Active	\N	\N	2026-09-11 04:54:19.762	2026-09-11 04:54:19.762
a4e4ec34-3896-41df-8a02-393fd9f6b32e	QA-CONC-Assign-1789102461045	9836052543	28	Female	Active	\N	\N	2026-09-11 04:54:21.054	2026-09-11 04:54:21.054
21e75c24-c3a8-4be8-b4b1-bec738d6062a	QA-CONC-Patient-1789102516049	9845030355	30	Male	Active	\N	\N	2026-09-11 04:55:16.058	2026-09-11 04:55:16.058
78be3d72-3bab-45d1-8327-fc9c096484c6	QA-CONC-Assign-1789102517162	9816665411	28	Female	Active	\N	\N	2026-09-11 04:55:17.172	2026-09-11 04:55:17.172
45285db8-f33b-43f2-b3de-93a11fa49125	QA-CONC-Patient-1789102565874	9821093217	30	Male	Active	\N	\N	2026-09-11 04:56:05.882	2026-09-11 04:56:05.882
ea149153-ec4f-484c-bcd9-aa5dc7d04003	QA-CONC-Assign-1789102567179	9855000957	28	Female	Active	\N	\N	2026-09-11 04:56:07.187	2026-09-11 04:56:07.187
f0d1c33b-3ec5-4ab1-97f2-3101e8a62cfc	QA-CONC-Patient-1789102583780	9845202002	30	Male	Active	\N	\N	2026-09-11 04:56:23.793	2026-09-11 04:56:23.793
233e75f8-581d-4d34-bb5d-740cea2e1ba5	QA-CONC-Assign-1789102585141	9851646199	28	Female	Active	\N	\N	2026-09-11 04:56:25.153	2026-09-11 04:56:25.153
0f565536-8212-4718-859a-d107930b1316	QA-CONC-Patient-1789102606793	9858708331	30	Male	Active	\N	\N	2026-09-11 04:56:46.804	2026-09-11 04:56:46.804
cc93dcb5-f735-4d10-a17d-989f75d0dcfd	QA-CONC-Patient-1789102626026	9813443248	30	Male	Active	\N	\N	2026-09-11 04:57:06.032	2026-09-11 04:57:06.032
decc1c95-2908-4280-b49c-0c770432421b	QA-CONC-Assign-1789102626588	9886636650	28	Female	Active	\N	\N	2026-09-11 04:57:06.594	2026-09-11 04:57:06.594
0df6f8f8-4f99-4a99-be28-eb0de22e9db1	QA-FIN-Calc-1789102662312	9858930977	35	Female	Active	\N	\N	2026-09-11 04:57:42.322	2026-09-11 04:57:42.322
22aec114-39c4-4198-87e6-d9fffa1a682f	QA-FIN-Partial-1789102663582	9812709508	40	Male	Active	\N	\N	2026-09-11 04:57:43.601	2026-09-11 04:57:43.601
ec59b833-cf68-4757-bf2c-28b08281e6e6	QA-FIN-Calc-1789102700161	9898361631	35	Female	Active	\N	\N	2026-09-11 04:58:20.17	2026-09-11 04:58:20.17
f085b94d-5340-4078-ad96-b3baaa7d77ff	QA-FIN-Partial-1789102700636	9887907736	40	Male	Active	\N	\N	2026-09-11 04:58:20.647	2026-09-11 04:58:20.647
7133d662-2490-4f79-9c7d-81197e59ae8f	QA-CrossRole-1789102828999	9811049296	28	Female	Active	\N	\N	2026-09-11 05:00:29.008	2026-09-11 05:00:29.008
eef65a9a-b0d5-4447-998f-af3f8a3a231d	QA-ActiveVisitGuard-1789102830240	9821481937	32	Male	Active	\N	\N	2026-09-11 05:00:30.248	2026-09-11 05:00:30.248
2ad6a29d-8ffa-44b7-9332-68a4a8e26314	QA-CrossRole-1789102845607	9862702947	28	Female	Active	\N	\N	2026-09-11 05:00:45.622	2026-09-11 05:00:45.622
82c90d5e-afd1-41cb-8cfb-03ac1d119df5	QA-ActiveVisitGuard-1789102846355	9894347138	32	Male	Active	\N	\N	2026-09-11 05:00:46.367	2026-09-11 05:00:46.367
0c7438ef-b6e6-4041-a819-786ad4813d99	QA-Patient-Persist-1789102873251	9813880759	45	Male	Active	\N	123 Anna Salai, Chennai, Tamil Nadu 600002	2026-09-11 05:01:13.262	2026-09-11 05:01:13.262
6e711cce-4e61-4fcd-b0ff-7e7fccd655a3	QA-CancelSafety-1789102874299	9857941242	50	Female	Active	\N	\N	2026-09-11 05:01:14.308	2026-09-11 05:01:14.308
f34bf024-f14f-468a-bf24-d9d33e6cdbb2	QA-Patient-Persist-1789102924337	9833439537	45	Male	Active	\N	456 OMR IT Highway, Sholinganallur, Chennai 600119	2026-09-11 05:02:04.346	2026-09-11 05:02:04.386
1a26a346-0f34-40d4-a2ff-2350ab26098f	QA-CancelSafety-1789102924529	9819658086	50	Female	Active	\N	\N	2026-09-11 05:02:04.537	2026-09-11 05:02:04.537
83a84cae-c2d8-4f6f-9bfc-82442714c6f8	QA-Patient-Persist-1789102950186	9855653639	45	Male	Active	\N	456 OMR IT Highway, Sholinganallur, Chennai 600119	2026-09-11 05:02:30.195	2026-09-11 05:02:30.232
980636b4-74f4-47c6-8df4-1110e0412d4d	QA-CancelSafety-1789102950383	9814758564	50	Female	Active	\N	\N	2026-09-11 05:02:30.393	2026-09-11 05:02:30.393
b0d7859c-5255-4660-9afb-d124db94d68a	QA_Cancel_1789103050621	9309314894	25	Male	Active			2026-09-11 05:04:15.657	2026-09-11 05:04:15.657
e9f83b68-094f-419f-a47b-ce86d3661f12	PW_TestPatient_1789103065660	9467668894	45	Male	Active			2026-09-11 05:04:29.961	2026-09-11 05:04:29.961
ca8769be-e3c5-402b-ac5c-9a1be8837198	PW_ErrorTest_1789103131860	9514438651	30	Male	Active			2026-09-11 05:05:40.685	2026-09-11 05:05:40.685
c19a7cb3-5aaa-46d6-9644-bd1b34c1bc78	QA-CONC-Patient-1789103249180	9852064546	30	Male	Active	\N	\N	2026-09-11 05:07:29.187	2026-09-11 05:07:29.187
baf2dcc9-c2ea-4d7e-b4f3-8aa6cae5d305	QA-CONC-Assign-1789103249745	9815400457	28	Female	Active	\N	\N	2026-09-11 05:07:29.762	2026-09-11 05:07:29.762
ff0e9d09-224e-4f74-a613-6195c6e546bd	QA-FIN-Calc-1789103257561	9818368154	35	Female	Active	\N	\N	2026-09-11 05:07:37.572	2026-09-11 05:07:37.572
d0857fca-4445-418e-9f29-b60e4a41160c	QA-FIN-Partial-1789103258074	9832216273	40	Male	Active	\N	\N	2026-09-11 05:07:38.086	2026-09-11 05:07:38.086
5a8bd431-40d5-49f6-923f-94df0809b0b8	QA-CrossRole-1789103278258	9895963867	28	Female	Active	\N	\N	2026-09-11 05:07:58.268	2026-09-11 05:07:58.268
fd95f70c-b7e6-4cf8-bd26-cc444cd94b50	QA-ActiveVisitGuard-1789103278822	9822534575	32	Male	Active	\N	\N	2026-09-11 05:07:58.83	2026-09-11 05:07:58.83
ebe9b9ef-2d9e-43a1-b899-18165b165a28	QA-Patient-Persist-1789103286502	9899556558	45	Male	Active	\N	456 OMR IT Highway, Sholinganallur, Chennai 600119	2026-09-11 05:08:06.515	2026-09-11 05:08:06.553
e1013964-d626-48d4-a1f2-00bf9a913621	QA-CancelSafety-1789103286700	9852702435	50	Female	Active	\N	\N	2026-09-11 05:08:06.708	2026-09-11 05:08:06.708
2fc5523e-064b-4af5-b8c9-76d6b5ed4c68	QA_Cancel_1789106825029	9383604798	25	Male	Active			2026-09-11 06:07:09.08	2026-09-11 06:07:09.08
e3ab0012-9284-46e7-9057-00002e5a8608	PW_TestPatient_1789106843764	9658043934	45	Male	Active			2026-09-11 06:07:27.84	2026-09-11 06:07:27.84
6c7210c5-1a05-4ff7-8872-56b94f531bfe	PW_ErrorTest_1789106907348	9583310504	30	Male	Active			2026-09-11 06:08:35.986	2026-09-11 06:08:35.986
8b5e8de3-b5f1-457c-b97f-e16399e99ccf	QA-FIN-Calc-1789107035052	9879657173	35	Female	Active	\N	\N	2026-09-11 06:10:35.062	2026-09-11 06:10:35.062
f8f1dd29-2ee8-4a67-ad2c-663fa10f4756	QA-FIN-Partial-1789107035552	9858041463	40	Male	Active	\N	\N	2026-09-11 06:10:35.563	2026-09-11 06:10:35.563
e61ce2a2-9426-4b86-a55f-123787152d9c	QA-CrossRole-1789107052600	9830160329	28	Female	Active	\N	\N	2026-09-11 06:10:52.608	2026-09-11 06:10:52.608
4f33cec2-5db3-4bd5-91e6-366af5ce5c6c	QA-ActiveVisitGuard-1789107053134	9878263384	32	Male	Active	\N	\N	2026-09-11 06:10:53.143	2026-09-11 06:10:53.143
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Payment" (id, "visitId", "patientId", amount, method, status, notes, date, "createdAt", "updatedAt") FROM stdin;
ab5dfdae-2979-41b0-b584-185d6cc38ab6	3e4a428a-6bd0-4cf2-b3aa-e41c5db7feff	1b4455bc-9405-44a8-8b5b-88e9660e0a83	4797	Cash	Completed	Patient requested partial payment | Alt Phone: 4353535345	2026-09-10T17:01:03.279Z	2026-09-10 17:01:03.282	2026-09-10 17:01:03.282
01c5972f-325f-4733-9a0a-f8711354126d	3e4a428a-6bd0-4cf2-b3aa-e41c5db7feff	1b4455bc-9405-44a8-8b5b-88e9660e0a83	613	Cash	Completed	Collecting outstanding balance	2026-09-10T17:03:41.046Z	2026-09-10 17:03:41.047	2026-09-10 17:03:41.047
3d4583bc-6833-4f88-a763-60d42a55ad5a	a4c08a25-1f94-43ad-b2a2-c02c5d0b65ed	e9a1dbef-e0ac-46eb-ab3c-999997beca59	580	Cash	Completed	\N	2026-09-11T04:45:37.516Z	2026-09-11 04:45:37.517	2026-09-11 04:45:37.517
5121dfbd-0d11-4881-8d5f-d818fa1f175e	51bec9f1-9305-42b8-8098-fde8ffa08330	cc93dcb5-f735-4d10-a17d-989f75d0dcfd	400	GPay	Completed	Partial payment B concurrency race	2026-09-11T04:57:06.422Z	2026-09-11 04:57:06.423	2026-09-11 04:57:06.423
b2d32193-2cf0-454f-b40c-b0e933fc7ddd	6974b354-8083-410c-b59b-4c9e95d745d6	22aec114-39c4-4198-87e6-d9fffa1a682f	300	Cash	Completed	Partial payment 1	2026-09-11T04:57:43.942Z	2026-09-11 04:57:43.942	2026-09-11 04:57:43.942
071760be-18e5-42fe-9ca6-f5992f226664	bd2d42a4-b267-407b-968d-365a1a12d60c	f085b94d-5340-4078-ad96-b3baaa7d77ff	300	Cash	Completed	Partial payment 1	2026-09-11T04:58:21.048Z	2026-09-11 04:58:21.049	2026-09-11 04:58:21.049
531eb948-4678-4953-a0c7-2f8e18d6a637	bd2d42a4-b267-407b-968d-365a1a12d60c	f085b94d-5340-4078-ad96-b3baaa7d77ff	700	GPay	Completed	Final balance settlement	2026-09-11T04:58:21.114Z	2026-09-11 04:58:21.114	2026-09-11 04:58:21.114
96512e03-ad6d-4241-835c-1181418ee59d	fd6ff133-c11f-4bce-9025-9334f4a7dac3	1a26a346-0f34-40d4-a2ff-2350ab26098f	100	Cash	Completed	Deposit before cancellation	2026-09-11T05:02:04.909Z	2026-09-11 05:02:04.91	2026-09-11 05:02:04.91
a4cc0a47-8e2d-4d8d-bae0-6918f3a35cc9	e783c34f-9b06-4568-8ac8-1728b7ea3121	980636b4-74f4-47c6-8df4-1110e0412d4d	100	Cash	Completed	Deposit before cancellation	2026-09-11T05:02:30.790Z	2026-09-11 05:02:30.79	2026-09-11 05:02:30.79
2f58ae4f-818a-4577-8905-2bb59301e86f	d2ac6adb-f65a-45a7-be7f-df0d8f7f0e35	e9f83b68-094f-419f-a47b-ce86d3661f12	525	Cash	Completed	\N	2026-09-11T05:05:02.375Z	2026-09-11 05:05:02.376	2026-09-11 05:05:02.376
6a98f845-8c3b-46ed-b3a8-36c8b09cf19b	fd6ff133-c11f-4bce-9025-9334f4a7dac3	1a26a346-0f34-40d4-a2ff-2350ab26098f	200	Cash	Completed	Collecting outstanding balance	2026-09-11T05:07:08.448Z	2026-09-11 05:07:08.448	2026-09-11 05:07:08.448
dfc804fb-3fef-42c7-90cb-714784d2dee9	ab25bcb2-ae80-41c5-b3a5-f1089e665b32	c19a7cb3-5aaa-46d6-9644-bd1b34c1bc78	400	Cash	Completed	Partial payment A concurrency race	2026-09-11T05:07:29.597Z	2026-09-11 05:07:29.597	2026-09-11 05:07:29.597
32cb64fd-7b66-4a76-be22-37a025c5c738	d45fe62e-0cfe-4601-8733-45e422c6ca86	d0857fca-4445-418e-9f29-b60e4a41160c	300	Cash	Completed	Partial payment 1	2026-09-11T05:07:38.438Z	2026-09-11 05:07:38.438	2026-09-11 05:07:38.438
9dad785c-2d32-48dc-8049-3f27f34d8fdc	d45fe62e-0cfe-4601-8733-45e422c6ca86	d0857fca-4445-418e-9f29-b60e4a41160c	700	GPay	Completed	Final balance settlement	2026-09-11T05:07:38.489Z	2026-09-11 05:07:38.489	2026-09-11 05:07:38.489
0b395a76-97b6-4d12-8ea0-5eb2ad2ca492	c29c0802-0248-4dfa-8cc1-7bf692d4ccf9	e1013964-d626-48d4-a1f2-00bf9a913621	100	Cash	Completed	Deposit before cancellation	2026-09-11T05:08:07.035Z	2026-09-11 05:08:07.036	2026-09-11 05:08:07.036
8d707cc3-3c3e-4421-97b5-34cb8d41d322	95b0d234-093e-4d24-ad4f-ec6bdbca3a67	e3ab0012-9284-46e7-9057-00002e5a8608	525	Cash	Completed	\N	2026-09-11T06:07:58.660Z	2026-09-11 06:07:58.661	2026-09-11 06:07:58.661
301d2c79-169e-4247-ba2c-5cebd560b6e4	ab25bcb2-ae80-41c5-b3a5-f1089e665b32	c19a7cb3-5aaa-46d6-9644-bd1b34c1bc78	100	Cash	Completed	Collecting outstanding balance	2026-09-11T06:10:09.424Z	2026-09-11 06:10:09.424	2026-09-11 06:10:09.424
b43490f9-1990-4615-92eb-3ff15f9c162d	26e8333c-2f09-4863-a9da-a69f43272a69	f8f1dd29-2ee8-4a67-ad2c-663fa10f4756	300	Cash	Completed	Partial payment 1	2026-09-11T06:10:35.971Z	2026-09-11 06:10:35.971	2026-09-11 06:10:35.971
242c96e3-fa3d-4864-a523-7f5d07983e00	26e8333c-2f09-4863-a9da-a69f43272a69	f8f1dd29-2ee8-4a67-ad2c-663fa10f4756	700	GPay	Completed	Final balance settlement	2026-09-11T06:10:36.026Z	2026-09-11 06:10:36.026	2026-09-11 06:10:36.026
\.


--
-- Data for Name: Prescription; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Prescription" (id, "visitId", "doctorId", status, notes, "createdAt", "updatedAt") FROM stdin;
be331405-24d1-44da-9dec-0abd272bc051	3e4a428a-6bd0-4cf2-b3aa-e41c5db7feff	66b9ace7-2946-495b-9d31-235628f64a25	Finalized		2026-09-10 17:00:03.987	2026-09-10 17:00:10.206
260dfc67-2c9e-43b2-ab24-599d16c523a1	d210dcef-c0c1-4852-ae06-01c99f584d83	81033cf6-ca0e-4138-af43-7b7c2e414254	Finalized		2026-09-11 04:43:56.742	2026-09-11 04:43:57.587
03dce619-72a3-4ae5-9e5f-76d447a4fe45	a4c08a25-1f94-43ad-b2a2-c02c5d0b65ed	81033cf6-ca0e-4138-af43-7b7c2e414254	Finalized		2026-09-11 04:45:24.622	2026-09-11 04:45:25.4
67029638-a137-4aff-b86d-ebb47e2c5e2c	d2ac6adb-f65a-45a7-be7f-df0d8f7f0e35	81033cf6-ca0e-4138-af43-7b7c2e414254	Finalized		2026-09-11 05:04:48.274	2026-09-11 05:04:49.148
de674188-229e-4a65-b8db-e6219c09cd48	95b0d234-093e-4d24-ad4f-ec6bdbca3a67	81033cf6-ca0e-4138-af43-7b7c2e414254	Finalized		2026-09-11 06:07:45.92	2026-09-11 06:07:46.629
\.


--
-- Data for Name: PrescriptionItem; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."PrescriptionItem" (id, "prescriptionId", "medicineId", quantity, dosage, frequency, duration, instructions, "createdAt", "updatedAt") FROM stdin;
e5f26539-15d0-42c9-a32e-a6d7d0e60a59	be331405-24d1-44da-9dec-0abd272bc051	595b0d93-19d1-4bdb-82f6-5e386853876d	5	1 Tablet	Three times daily	2 days	Before Breakfast, Before Dinner, Before Lunch	2026-09-10 17:00:03.998	2026-09-10 17:00:03.998
19e5c7ac-a986-4466-bb29-73cefe62ed15	260dfc67-2c9e-43b2-ab24-599d16c523a1	595b0d93-19d1-4bdb-82f6-5e386853876d	1	1 Tablet	Twice daily	5 days	After Breakfast, After Dinner	2026-09-11 04:43:56.752	2026-09-11 04:43:56.752
cabe1b16-73a1-4f87-b6a3-d94906572549	03dce619-72a3-4ae5-9e5f-76d447a4fe45	595b0d93-19d1-4bdb-82f6-5e386853876d	1	1 Tablet	Twice daily	5 days	After Breakfast, After Dinner	2026-09-11 04:45:24.627	2026-09-11 04:45:24.627
b1af0027-4af2-4d58-885b-e852d52ab1ae	67029638-a137-4aff-b86d-ebb47e2c5e2c	be5b392a-6891-4ce6-9c4b-22773ff93217	1	1 Tablet	Twice daily	5 days	After Breakfast, After Dinner	2026-09-11 05:04:48.279	2026-09-11 05:04:48.279
65da25a2-48b9-4c08-b6d4-1a1dddce66bc	de674188-229e-4a65-b8db-e6219c09cd48	be5b392a-6891-4ce6-9c4b-22773ff93217	1	1 Tablet	Twice daily	5 days	After Breakfast, After Dinner	2026-09-11 06:07:45.923	2026-09-11 06:07:45.923
\.


--
-- Data for Name: PurchaseOrder; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."PurchaseOrder" (id, "orderNumber", "supplierId", "orderDate", status, notes, "createdAt", "updatedAt") FROM stdin;
eb873b15-15c9-43c8-a66b-c3cf04e578dd	PO-202609-006	5ad59103-4351-4aa0-a212-f0161547329c	2026-09-11 00:00:00	Received	QA PO Lifecycle Test	2026-09-11 05:07:46.566	2026-09-11 05:07:46.731
e08a141b-e20a-4eb9-8db0-2b4707581b44	PO-202609-007	5ad59103-4351-4aa0-a212-f0161547329c	2026-09-11 00:00:00	Received	QA PO Lifecycle Test	2026-09-11 06:10:44.134	2026-09-11 06:10:44.303
91f5f074-3839-4846-b90f-964b649d8b7d	PO-202609-001	5ad59103-4351-4aa0-a212-f0161547329c	2026-09-10 00:00:00	Received	\N	2026-09-10 17:10:49.768	2026-09-10 17:11:01.246
269781be-c555-438a-b2ed-a9fb6ff7f7d8	PO-202609-002	5ad59103-4351-4aa0-a212-f0161547329c	2026-09-11 00:00:00	Received	test	2026-09-10 17:30:29.997	2026-09-10 17:31:16.637
3a80f329-11e0-4afa-a5c2-399132148ed5	PO-202609-003	5ad59103-4351-4aa0-a212-f0161547329c	2026-09-11 00:00:00	Draft	QA PO Lifecycle Test	2026-09-11 04:58:46.589	2026-09-11 04:58:46.589
5c1aa8fc-5907-4b97-8dd1-a9577b0bd57d	PO-202609-004	5ad59103-4351-4aa0-a212-f0161547329c	2026-09-11 00:00:00	Partially Received	QA PO Lifecycle Test	2026-09-11 04:59:19.848	2026-09-11 04:59:19.921
f5c596de-f27a-41e5-901a-57d729ef5426	PO-202609-005	5ad59103-4351-4aa0-a212-f0161547329c	2026-09-11 00:00:00	Received	QA PO Lifecycle Test	2026-09-11 04:59:51.331	2026-09-11 04:59:51.496
\.


--
-- Data for Name: PurchaseOrderItem; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."PurchaseOrderItem" (id, "purchaseOrderId", "medicineId", "orderedQuantity", "receivedQuantity", "unitCost", "createdAt", "updatedAt") FROM stdin;
86d5ebb8-cb7b-4c7c-b67d-21f9038d9222	f5c596de-f27a-41e5-901a-57d729ef5426	be5b392a-6891-4ce6-9c4b-22773ff93217	20	20	50	2026-09-11 04:59:51.331	2026-09-11 04:59:51.49
b23dd8a3-05b1-4a30-a19c-d1822fc3e51d	eb873b15-15c9-43c8-a66b-c3cf04e578dd	be5b392a-6891-4ce6-9c4b-22773ff93217	20	20	50	2026-09-11 05:07:46.566	2026-09-11 05:07:46.722
8151c22e-8cd9-4f3a-974f-b2e68c7b4c64	e08a141b-e20a-4eb9-8db0-2b4707581b44	be5b392a-6891-4ce6-9c4b-22773ff93217	20	20	50	2026-09-11 06:10:44.134	2026-09-11 06:10:44.296
dd6a2cc7-39b2-4bf0-ad6d-9b60123ec61e	91f5f074-3839-4846-b90f-964b649d8b7d	595b0d93-19d1-4bdb-82f6-5e386853876d	50	50	80	2026-09-10 17:10:49.768	2026-09-10 17:11:01.23
849c796f-4717-43ad-b75b-d5464fed6be8	269781be-c555-438a-b2ed-a9fb6ff7f7d8	595b0d93-19d1-4bdb-82f6-5e386853876d	50	50	80	2026-09-10 17:30:29.997	2026-09-10 17:31:16.626
559dd79c-997f-4d29-a073-6aa0279fb7ab	3a80f329-11e0-4afa-a5c2-399132148ed5	2d10756c-c150-423a-b177-2d5c44f7485c	20	0	50	2026-09-11 04:58:46.589	2026-09-11 04:58:46.589
119d5296-d9f6-4875-b92d-0d06170aa399	5c1aa8fc-5907-4b97-8dd1-a9577b0bd57d	be5b392a-6891-4ce6-9c4b-22773ff93217	20	8	50	2026-09-11 04:59:19.848	2026-09-11 04:59:19.913
\.


--
-- Data for Name: QueueEntry; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."QueueEntry" (id, "visitId", "patientId", "assignedDoctorId", "position", status, priority, "arrivalTime", "createdAt", "updatedAt") FROM stdin;
ebd0fc71-4692-4f76-ad01-8fef0e050ec5	5b4d9dd9-9e1d-4268-8a21-7b1361e5430a	6e711cce-4e61-4fcd-b0ff-7e7fccd655a3	\N	27	Waiting	f	10:31 am	2026-09-11 05:01:14.338	2026-09-11 05:01:14.338
3b16d2f0-5080-44c7-9968-d26ab249adc5	3e4a428a-6bd0-4cf2-b3aa-e41c5db7feff	1b4455bc-9405-44a8-8b5b-88e9660e0a83	66b9ace7-2946-495b-9d31-235628f64a25	1	Completed	f	10:21 pm	2026-09-10 16:51:43.034	2026-09-10 17:00:10.227
be43dd6b-efc1-4599-abeb-956b33fd3dc0	0aec7dcb-36f4-4b24-8581-1afd7d1818e9	c75f0db0-aa4e-4d1f-a380-730b50599694	\N	2	Cancelled	f	10:22 pm	2026-09-10 16:52:04.268	2026-09-10 17:03:50.159
60b57b2b-aa0b-4c86-b79d-2ce316e6a4c8	7a9d947e-8e2d-4798-8713-8462efa6b5b9	b42ebfea-4165-4a60-b0a4-f032ca096c5f	\N	3	Cancelled	f	10:26 pm	2026-09-10 16:56:45.382	2026-09-10 17:03:59.913
d81bfa6f-1755-4b0f-a447-d1d38da41a3b	e6450da2-b92e-4bad-a889-4ac0e7d1a978	1b8314c0-ce8a-4fba-aef2-fda7f8fa5516	\N	1	Cancelled	f	10:12 am	2026-09-11 04:42:34.929	2026-09-11 04:42:36.818
c18c2993-fe40-431c-b27c-47bad2be8b9c	50e99a6a-f657-4782-a2c7-40a7fc4b15e5	9a051b02-a36a-410b-991f-cd2a40bb3590	\N	2	Waiting	f	10:12 am	2026-09-11 04:42:58.813	2026-09-11 04:42:58.813
99de5b9d-8846-4b2c-8a02-b87798b9e15e	6974b354-8083-410c-b59b-4c9e95d745d6	22aec114-39c4-4198-87e6-d9fffa1a682f	\N	20	Completed	f	10:27 am	2026-09-11 04:57:43.625	2026-09-11 04:57:43.824
fd1de34d-4769-463a-a772-8e4a4b54a174	d210dcef-c0c1-4852-ae06-01c99f584d83	1b7c239f-02c0-414c-aa46-fb211b3ed7e4	81033cf6-ca0e-4138-af43-7b7c2e414254	3	Completed	f	10:13 am	2026-09-11 04:43:39.204	2026-09-11 04:43:57.596
2753ad5c-4295-42c2-9680-43c755308bc5	a4c08a25-1f94-43ad-b2a2-c02c5d0b65ed	e9a1dbef-e0ac-46eb-ab3c-999997beca59	81033cf6-ca0e-4138-af43-7b7c2e414254	4	Completed	f	10:15 am	2026-09-11 04:45:06.854	2026-09-11 04:45:25.407
47bfd363-7458-44e1-980c-7b285b806fc1	5dfa61e1-bd32-4fe4-ba11-1c4df2835be5	0dbdf4cb-844c-42e5-9e8e-ced6df9d734c	\N	5	Waiting	f	10:16 am	2026-09-11 04:46:16.276	2026-09-11 04:46:16.276
41b85da6-4472-4dba-bbca-c003b4a84863	ccf9b790-c138-4a9f-af35-b7caf812bad8	73c365ff-12db-41d5-a0e2-04b47b448550	\N	6	Waiting	f	10:23 am	2026-09-11 04:53:43.171	2026-09-11 04:53:43.171
f588d662-aa8c-4729-a36d-1b7ca8c3a117	68b34141-771c-4efd-9b7a-243e29e04828	3ecef4ed-2ee5-4385-ab99-3a69d94b6c59	\N	7	Waiting	f	10:23 am	2026-09-11 04:53:44.432	2026-09-11 04:53:44.432
38f17ec7-5565-4bc0-8af8-02204f449051	4b6314be-bc68-484d-8ad9-996ada4e271a	d57dd7ff-cd1e-499a-92fc-ad82f71dcaf2	\N	8	Waiting	f	10:24 am	2026-09-11 04:54:19.796	2026-09-11 04:54:19.796
09f11e33-8b57-4a3d-bda6-3ba1026e6ecb	2eb369ab-95c3-4b17-9463-0a7098a80363	a4e4ec34-3896-41df-8a02-393fd9f6b32e	\N	9	Waiting	f	10:24 am	2026-09-11 04:54:21.078	2026-09-11 04:54:21.078
fc193dd7-b376-463b-aca5-5d01331bc4c4	3b498efb-fe9f-42f3-afee-3436457c7cfd	21e75c24-c3a8-4be8-b4b1-bec738d6062a	\N	10	Waiting	f	10:25 am	2026-09-11 04:55:16.078	2026-09-11 04:55:16.078
d76c6729-a5d2-4655-bb2a-55274b075764	8b170a1c-74ea-4c1b-a706-a128e2043142	78be3d72-3bab-45d1-8327-fc9c096484c6	\N	11	Waiting	f	10:25 am	2026-09-11 04:55:17.194	2026-09-11 04:55:17.194
35ffde71-c31d-4eaf-af1b-d96778813621	32a95191-ffbb-48b4-b70c-3afa5095f103	45285db8-f33b-43f2-b3de-93a11fa49125	\N	12	Waiting	f	10:26 am	2026-09-11 04:56:05.907	2026-09-11 04:56:05.907
6e26f56e-6bec-4f21-bb21-93d2a8e26baa	33e107e7-a92f-4bea-932d-02c3c765149f	ea149153-ec4f-484c-bcd9-aa5dc7d04003	\N	13	Waiting	f	10:26 am	2026-09-11 04:56:07.21	2026-09-11 04:56:07.21
cc9b325d-3aad-4a92-b2c0-9e7035882ab8	a9c1d963-0a66-4516-9a68-8ba415e08273	f0d1c33b-3ec5-4ab1-97f2-3101e8a62cfc	\N	14	Waiting	f	10:26 am	2026-09-11 04:56:23.814	2026-09-11 04:56:23.814
479ff80d-a197-4e51-ad32-de1799f85392	358fd18f-a1fb-421f-b787-f31e3b09741d	233e75f8-581d-4d34-bb5d-740cea2e1ba5	\N	15	Waiting	f	10:26 am	2026-09-11 04:56:25.177	2026-09-11 04:56:25.177
88e07876-a410-473e-a5e4-b08ec0bef0b3	31cb976e-f788-4fa8-8748-99fbea33c2c6	0f565536-8212-4718-859a-d107930b1316	\N	16	Waiting	f	10:26 am	2026-09-11 04:56:46.832	2026-09-11 04:56:46.832
0805285b-f8a5-4344-90fc-85f42ffd3481	51bec9f1-9305-42b8-8098-fde8ffa08330	cc93dcb5-f735-4d10-a17d-989f75d0dcfd	\N	17	Completed	f	10:27 am	2026-09-11 04:57:06.06	2026-09-11 04:57:06.272
0f14337f-ec64-479a-b7c6-5452fdbd6e2f	38dd4f47-0a64-474d-9702-1ff6c12eb2d8	decc1c95-2908-4280-b49c-0c770432421b	\N	18	Waiting	f	10:27 am	2026-09-11 04:57:06.616	2026-09-11 04:57:06.616
10bb2ed2-8515-43a1-87b9-e0f5f93ed0ce	3b377652-72ba-4234-ba0a-afd82da9df6e	ec59b833-cf68-4757-bf2c-28b08281e6e6	\N	21	Completed	f	10:28 am	2026-09-11 04:58:20.193	2026-09-11 04:58:20.393
2b0de88f-e3b0-41c1-b712-a146c9f623c8	1763e5cf-5e25-4315-9926-90c37a622597	0df6f8f8-4f99-4a99-be28-eb0de22e9db1	\N	19	Completed	f	10:27 am	2026-09-11 04:57:42.35	2026-09-11 04:57:42.597
c47a211b-83ab-4ca6-990f-16a710809a4f	bd2d42a4-b267-407b-968d-365a1a12d60c	f085b94d-5340-4078-ad96-b3baaa7d77ff	\N	22	Completed	f	10:28 am	2026-09-11 04:58:20.671	2026-09-11 04:58:20.932
17785b3a-2ca6-4e79-8398-f3b6bf6b5a18	ba8ea7dc-c4b0-4b09-9abb-a06a990b8064	7133d662-2490-4f79-9c7d-81197e59ae8f	81033cf6-ca0e-4138-af43-7b7c2e414254	23	With Doctor	f	10:30 am	2026-09-11 05:00:29.037	2026-09-11 05:00:29.187
9c1f8245-cf63-4eea-a856-e78de859a085	6409d006-c229-47ff-8d6e-68b6632ebf0b	eef65a9a-b0d5-4447-998f-af3f8a3a231d	\N	24	Waiting	f	10:30 am	2026-09-11 05:00:30.27	2026-09-11 05:00:30.27
6acb474d-850c-4e4b-a9ad-ba68b6b798b6	fd6ff133-c11f-4bce-9025-9334f4a7dac3	1a26a346-0f34-40d4-a2ff-2350ab26098f	81033cf6-ca0e-4138-af43-7b7c2e414254	28	Completed	f	10:32 am	2026-09-11 05:02:04.58	2026-09-11 05:02:04.789
0de4513b-975a-4a72-a0ff-6e8369d3ba2f	1f774e84-8b65-44dc-80be-1cff48700244	2ad6a29d-8ffa-44b7-9332-68a4a8e26314	81033cf6-ca0e-4138-af43-7b7c2e414254	25	Completed	f	10:30 am	2026-09-11 05:00:45.649	2026-09-11 05:00:45.965
760aa1b0-c729-4257-8412-3a015b9dff01	e8065343-0973-46f2-8eac-8cc3e09202c1	82c90d5e-afd1-41cb-8cfb-03ac1d119df5	\N	26	Waiting	f	10:30 am	2026-09-11 05:00:46.389	2026-09-11 05:00:46.389
03cef8e8-7800-419c-8933-6c7187f37bf1	b0acd5b2-9966-43ed-a9da-5f419d3f4e8e	b0d7859c-5255-4660-9afb-d124db94d68a	\N	30	Cancelled	f	10:34 am	2026-09-11 05:04:15.705	2026-09-11 05:04:17.615
f292206b-3689-4b54-857a-807109c6c246	e783c34f-9b06-4568-8ac8-1728b7ea3121	980636b4-74f4-47c6-8df4-1110e0412d4d	81033cf6-ca0e-4138-af43-7b7c2e414254	29	Cancelled	f	10:32 am	2026-09-11 05:02:30.452	2026-09-11 05:02:30.812
99478670-5d8c-4385-a8fa-dedea45fa4ab	d2ac6adb-f65a-45a7-be7f-df0d8f7f0e35	e9f83b68-094f-419f-a47b-ce86d3661f12	81033cf6-ca0e-4138-af43-7b7c2e414254	31	Completed	f	10:34 am	2026-09-11 05:04:30.034	2026-09-11 05:04:49.156
80e126fe-b00f-48cc-aef9-065993967ad5	640acc8f-5eff-44db-82bd-387590b3d32b	ca8769be-e3c5-402b-ac5c-9a1be8837198	\N	32	Waiting	f	10:35 am	2026-09-11 05:05:40.733	2026-09-11 05:05:40.733
0e854b87-f92a-44fa-89c4-8229445e9bf9	1a8375f4-e496-44c0-95c4-9ca75c230a5f	baf2dcc9-c2ea-4d7e-b4f3-8aa6cae5d305	\N	34	Waiting	f	10:37 am	2026-09-11 05:07:29.788	2026-09-11 05:07:29.788
9efc56d9-8f64-4c60-8a37-9379852128a7	ab25bcb2-ae80-41c5-b3a5-f1089e665b32	c19a7cb3-5aaa-46d6-9644-bd1b34c1bc78	\N	33	Completed	f	10:37 am	2026-09-11 05:07:29.214	2026-09-11 05:07:29.444
720fe566-3fa4-466b-94ce-313120e594fd	21e3c118-7843-4b33-b823-82b334b614a0	ff0e9d09-224e-4f74-a613-6195c6e546bd	\N	35	Completed	f	10:37 am	2026-09-11 05:07:37.6	2026-09-11 05:07:37.823
dc3894df-7fa2-4154-8cf9-d4ae6028ad97	d45fe62e-0cfe-4601-8733-45e422c6ca86	d0857fca-4445-418e-9f29-b60e4a41160c	\N	36	Completed	f	10:37 am	2026-09-11 05:07:38.106	2026-09-11 05:07:38.326
b5e714e8-4588-421a-9d9c-f3742f5ca505	209f2b62-b4fd-4e87-adcd-a039024650f6	fd95f70c-b7e6-4cf8-bd26-cc444cd94b50	\N	38	Waiting	f	10:37 am	2026-09-11 05:07:58.852	2026-09-11 05:07:58.852
f8bc9556-5b37-4433-a93e-68a891d71e82	7459a9fb-550b-45bb-8b61-4a49c038e974	5a8bd431-40d5-49f6-923f-94df0809b0b8	81033cf6-ca0e-4138-af43-7b7c2e414254	37	Completed	f	10:37 am	2026-09-11 05:07:58.292	2026-09-11 05:07:58.541
21836a14-aed6-4df0-99aa-0cd6bba563e0	c29c0802-0248-4dfa-8cc1-7bf692d4ccf9	e1013964-d626-48d4-a1f2-00bf9a913621	81033cf6-ca0e-4138-af43-7b7c2e414254	39	Cancelled	f	10:38 am	2026-09-11 05:08:06.744	2026-09-11 05:08:07.06
704d253c-1061-4be6-b05f-8248644541e9	4882f6bb-d210-45cd-b076-8ae4755d02f8	2fc5523e-064b-4af5-b8c9-76d6b5ed4c68	\N	40	Cancelled	f	11:37 am	2026-09-11 06:07:09.133	2026-09-11 06:07:12.354
dbf96df8-be0d-4d58-9e1f-91f4f246e4b7	95b0d234-093e-4d24-ad4f-ec6bdbca3a67	e3ab0012-9284-46e7-9057-00002e5a8608	81033cf6-ca0e-4138-af43-7b7c2e414254	41	Completed	f	11:37 am	2026-09-11 06:07:27.891	2026-09-11 06:07:46.632
4a268bc0-f2df-43c4-8cac-29cf8e5ea365	39b3bc0c-0448-4488-81f3-cbab9543bf0a	6c7210c5-1a05-4ff7-8872-56b94f531bfe	\N	42	Waiting	f	11:38 am	2026-09-11 06:08:36.01	2026-09-11 06:08:36.01
ce6048df-9313-4962-9413-50f172ecd716	6c72b8a4-2aa3-4023-9767-e54e489b069c	8b5e8de3-b5f1-457c-b97f-e16399e99ccf	\N	43	Completed	f	11:40 am	2026-09-11 06:10:35.088	2026-09-11 06:10:35.314
61581ec6-7c95-4f7b-8f79-caffc59f84be	26e8333c-2f09-4863-a9da-a69f43272a69	f8f1dd29-2ee8-4a67-ad2c-663fa10f4756	\N	44	Completed	f	11:40 am	2026-09-11 06:10:35.595	2026-09-11 06:10:35.861
fcb5eeab-db22-4844-b68b-f585d6f984b6	8519c1de-5fe2-4c0e-9ad0-0aeaf8c71c70	e61ce2a2-9426-4b86-a55f-123787152d9c	81033cf6-ca0e-4138-af43-7b7c2e414254	45	Completed	f	11:40 am	2026-09-11 06:10:52.629	2026-09-11 06:10:52.862
d8f80499-24bd-41e7-823d-90c4a63db2d8	7c8867af-6ce5-4e3e-80f9-69f1dd14f443	4f33cec2-5db3-4bd5-91e6-366af5ce5c6c	\N	46	Waiting	f	11:40 am	2026-09-11 06:10:53.174	2026-09-11 06:10:53.174
\.


--
-- Data for Name: Staff; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Staff" (id, name, phone, role, status, attendance, "roomNumber", "createdAt", "updatedAt") FROM stdin;
81033cf6-ca0e-4138-af43-7b7c2e414254	Dr. QA Duty Doctor	9876543210	Duty Doctor	Active	Present	Room 102	2026-09-11 04:40:38.501	2026-09-11 06:10:52.504
881dcbef-2971-4255-a110-7e840554e133	Dr. Arun	9876543210	Head Doctor	Active	Present	101	2026-09-07 15:21:52.497	2026-09-10 16:06:40.002
47d93f66-98e3-41d2-b206-751424965018	Harinarayanan A	8248305219	Receptionist	Active	Present	\N	2026-09-10 16:11:54.239	2026-09-10 16:11:54.239
66b9ace7-2946-495b-9d31-235628f64a25	Dr.Yokesh	9797879879	Duty Doctor	Active	Present	102	2026-09-10 16:24:57.521	2026-09-10 16:24:57.521
bf093e95-f5ac-4218-af5d-33117e3a669d	Dr.Irfan	2353446356	Duty Doctor	Active	Present	103	2026-09-10 16:25:17.941	2026-09-10 16:25:17.941
\.


--
-- Data for Name: StockMovement; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."StockMovement" (id, "medicineId", "movementType", quantity, "balanceAfter", "referenceType", "referenceId", reason, "performedBy", "createdAt") FROM stdin;
4e3f91ef-c704-4fc6-b685-c16e54b99dbf	595b0d93-19d1-4bdb-82f6-5e386853876d	DISPENSING	-4	96	VISIT	3e4a428a-6bd0-4cf2-b3aa-e41c5db7feff	Dispensed to patient for Visit #3e4a428a	receptionist	2026-09-10 17:00:38.504
950179a9-feb4-46bb-8909-578897e3786d	595b0d93-19d1-4bdb-82f6-5e386853876d	PURCHASE_RECEIPT	50	146	PURCHASE_ORDER	91f5f074-3839-4846-b90f-964b649d8b7d	Goods received against PO-202609-001	headdoctor	2026-09-10 17:11:01.24
faeb0633-f26b-405b-895b-6cb9e065ca48	595b0d93-19d1-4bdb-82f6-5e386853876d	PURCHASE_RECEIPT	40	186	PURCHASE_ORDER	269781be-c555-438a-b2ed-a9fb6ff7f7d8	Goods received against PO-202609-002	headdoctor	2026-09-10 17:30:38.425
dc8e52f8-f970-4b02-afb5-fdae02db7456	595b0d93-19d1-4bdb-82f6-5e386853876d	PURCHASE_RECEIPT	10	196	PURCHASE_ORDER	269781be-c555-438a-b2ed-a9fb6ff7f7d8	Goods received against PO-202609-002	headdoctor	2026-09-10 17:31:16.634
e4bff3fd-8e14-4ed3-8eb7-1e6735b72a87	595b0d93-19d1-4bdb-82f6-5e386853876d	DISPENSING	-1	195	VISIT	d210dcef-c0c1-4852-ae06-01c99f584d83	Dispensed to patient for Visit #d210dcef	receptionist	2026-09-11 04:44:08.483
e68a9f87-f3bb-41a3-904c-c8d9366ea496	595b0d93-19d1-4bdb-82f6-5e386853876d	DISPENSING	-1	194	VISIT	a4c08a25-1f94-43ad-b2a2-c02c5d0b65ed	Dispensed to patient for Visit #a4c08a25	receptionist	2026-09-11 04:45:36.127
642f693c-b6e6-47c9-8b4b-2e5458ed0364	be5b392a-6891-4ce6-9c4b-22773ff93217	PURCHASE_RECEIPT	8	8	PURCHASE_ORDER	5c1aa8fc-5907-4b97-8dd1-a9577b0bd57d	Goods received against PO-202609-004	headdoctor	2026-09-11 04:59:19.918
cdfe0499-a834-4aae-ac9a-970942b77de0	be5b392a-6891-4ce6-9c4b-22773ff93217	PURCHASE_RECEIPT	8	16	PURCHASE_ORDER	f5c596de-f27a-41e5-901a-57d729ef5426	Goods received against PO-202609-005	headdoctor	2026-09-11 04:59:51.401
d8c0d4d9-ffcb-407f-bcf7-65ed5f99142d	be5b392a-6891-4ce6-9c4b-22773ff93217	PURCHASE_RECEIPT	12	28	PURCHASE_ORDER	f5c596de-f27a-41e5-901a-57d729ef5426	Goods received against PO-202609-005	headdoctor	2026-09-11 04:59:51.494
6285fee5-4279-4456-a7e8-8d3e5c019c10	2682ee90-fb77-467b-b92c-86aa9bca8ebd	ADJUSTMENT	10	10	MANUAL	\N	Initial test stock	headdoctor	2026-09-11 04:59:51.933
5cbb2636-1d91-4dc8-bdd6-d73b68b99ca7	2682ee90-fb77-467b-b92c-86aa9bca8ebd	ADJUSTMENT	-10	0	MANUAL	\N	Zero out stock for test	headdoctor	2026-09-11 04:59:51.966
9415e0f7-d43f-4b20-a417-af12f55f8ac5	be5b392a-6891-4ce6-9c4b-22773ff93217	DISPENSING	-1	27	VISIT	d2ac6adb-f65a-45a7-be7f-df0d8f7f0e35	Dispensed to patient for Visit #d2ac6adb	receptionist	2026-09-11 05:05:01.003
9c6d518e-2309-4e0b-a38b-548e398e9b1f	be5b392a-6891-4ce6-9c4b-22773ff93217	PURCHASE_RECEIPT	8	35	PURCHASE_ORDER	eb873b15-15c9-43c8-a66b-c3cf04e578dd	Goods received against PO-202609-006	headdoctor	2026-09-11 05:07:46.637
e79518f9-8fe3-4b66-ace6-7654317ddcc1	be5b392a-6891-4ce6-9c4b-22773ff93217	PURCHASE_RECEIPT	12	47	PURCHASE_ORDER	eb873b15-15c9-43c8-a66b-c3cf04e578dd	Goods received against PO-202609-006	headdoctor	2026-09-11 05:07:46.729
ca16842f-0f3d-4462-b3a5-3c2d93d8f7f6	0c520c40-ebf1-4d96-bc1e-17a4a20f0adf	ADJUSTMENT	10	10	MANUAL	\N	Initial test stock	headdoctor	2026-09-11 05:07:47.188
8b1b8335-23b8-475c-9a78-ca4b81fe505c	0c520c40-ebf1-4d96-bc1e-17a4a20f0adf	ADJUSTMENT	-10	0	MANUAL	\N	Zero out stock for test	headdoctor	2026-09-11 05:07:47.219
598f84c4-7c24-4e1f-8474-1c2283c99e71	be5b392a-6891-4ce6-9c4b-22773ff93217	DISPENSING	-1	46	VISIT	95b0d234-093e-4d24-ad4f-ec6bdbca3a67	Dispensed to patient for Visit #95b0d234	receptionist	2026-09-11 06:07:57.862
6e16b1b4-a213-4487-b47f-3f4dc763a7cf	be5b392a-6891-4ce6-9c4b-22773ff93217	PURCHASE_RECEIPT	8	54	PURCHASE_ORDER	e08a141b-e20a-4eb9-8db0-2b4707581b44	Goods received against PO-202609-007	headdoctor	2026-09-11 06:10:44.216
91e58226-33a0-4fa3-82c9-25960e6dbea3	be5b392a-6891-4ce6-9c4b-22773ff93217	PURCHASE_RECEIPT	12	66	PURCHASE_ORDER	e08a141b-e20a-4eb9-8db0-2b4707581b44	Goods received against PO-202609-007	headdoctor	2026-09-11 06:10:44.302
bbd08802-f22e-46a7-b53a-4685b3052166	d2482820-7619-434c-b1ea-d8ea6918be77	ADJUSTMENT	10	10	MANUAL	\N	Initial test stock	headdoctor	2026-09-11 06:10:44.703
439552d8-5d6b-4ccd-8106-b6a084277182	d2482820-7619-434c-b1ea-d8ea6918be77	ADJUSTMENT	-10	0	MANUAL	\N	Zero out stock for test	headdoctor	2026-09-11 06:10:44.735
\.


--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Supplier" (id, name, "contactPerson", phone, email, address, status, "createdAt", "updatedAt") FROM stdin;
5ad59103-4351-4aa0-a212-f0161547329c	Supplier 1	MR.X	08248305219	adharshhari77@gmail.com	No 1, Ruba nagar, sundakkamuthur	Active	2026-09-10 16:15:38.643	2026-09-10 16:15:38.643
\.


--
-- Data for Name: SupplierBill; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."SupplierBill" (id, "supplierId", "purchaseOrderId", "invoiceNumber", "invoiceDate", amount, notes, status, "createdAt", "updatedAt", "billImageUrl") FROM stdin;
09720077-2795-4e4c-b3d8-869ef9bf0565	5ad59103-4351-4aa0-a212-f0161547329c	91f5f074-3839-4846-b90f-964b649d8b7d	in2021	2026-09-10 00:00:00	4000	\N	Paid	2026-09-10 17:19:55.112	2026-09-10 17:22:13.747	\N
653551a0-e8a5-468a-9354-7e8cb01965a2	5ad59103-4351-4aa0-a212-f0161547329c	269781be-c555-438a-b2ed-a9fb6ff7f7d8	inv21	2026-09-10 00:00:00	3200	\N	Paid	2026-09-10 17:31:02.606	2026-09-10 17:31:07.771	\N
dc5b90d9-5de2-4658-9ba3-8570bd0a8ef0	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-CONC-1789102376006	2026-09-11 00:00:00	1000	Concurrency Test Bill ₹1000	Partial	2026-09-11 04:52:56.023	2026-09-11 04:52:56.061	\N
25238208-8131-4000-8cc6-1a61a8a3be89	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-CONC-1789102422901	2026-09-11 00:00:00	1000	Concurrency Test Bill ₹1000	Partial	2026-09-11 04:53:42.912	2026-09-11 04:53:42.953	\N
782d9efe-ee3c-4d46-8161-af962bae0de7	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-CONC-1789102459536	2026-09-11 00:00:00	1000	Concurrency Test Bill ₹1000	Partial	2026-09-11 04:54:19.549	2026-09-11 04:54:19.577	\N
1daac4d7-8163-45d2-ac12-df151edbd84b	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-CONC-1789102515855	2026-09-11 00:00:00	1000	Concurrency Test Bill ₹1000	Partial	2026-09-11 04:55:15.869	2026-09-11 04:55:15.9	\N
55facbe4-e196-450a-973c-33eebea5d735	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-CONC-1789102565646	2026-09-11 00:00:00	1000	Concurrency Test Bill ₹1000	Partial	2026-09-11 04:56:05.66	2026-09-11 04:56:05.693	\N
49878ad2-bb21-44b9-8010-d3f6555bba36	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-CONC-1789102583589	2026-09-11 00:00:00	1000	Concurrency Test Bill ₹1000	Partial	2026-09-11 04:56:23.607	2026-09-11 04:56:23.634	\N
924bc40a-3c8f-427b-806e-a1b1ae283385	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-CONC-1789102625811	2026-09-11 00:00:00	1000	Concurrency Test Bill ₹1000	Partial	2026-09-11 04:57:05.822	2026-09-11 04:57:05.852	\N
232225a5-a715-46f7-8efd-3978cecfa06c	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-FIN-1789102665118	2026-09-11 00:00:00	10000	Financial test bill ₹10,000	Paid	2026-09-11 04:57:45.138	2026-09-11 04:57:45.211	\N
038de0dc-94b6-432c-b519-b78fbef9a0a4	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-FIN-1789102701340	2026-09-11 00:00:00	10000	Financial test bill ₹10,000	Paid	2026-09-11 04:58:21.351	2026-09-11 04:58:21.423	\N
d2269780-20ef-44ab-bb04-f84c10610909	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-CONC-1789103248971	2026-09-11 00:00:00	1000	Concurrency Test Bill ₹1000	Partial	2026-09-11 05:07:28.985	2026-09-11 05:07:29.019	\N
1012db52-f4f7-40aa-84d5-0fdfc41cce48	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-FIN-1789103258677	2026-09-11 00:00:00	10000	Financial test bill ₹10,000	Paid	2026-09-11 05:07:38.7	2026-09-11 05:07:38.772	\N
a388cd01-0f85-421a-a2e9-52e0ae94e793	5ad59103-4351-4aa0-a212-f0161547329c	\N	INV-FIN-1789107036207	2026-09-11 00:00:00	10000	Financial test bill ₹10,000	Paid	2026-09-11 06:10:36.218	2026-09-11 06:10:36.282	\N
\.


--
-- Data for Name: SupplierMedicineCategory; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."SupplierMedicineCategory" (id, "supplierId", "medicineCategoryId", "createdAt") FROM stdin;
5faa07ba-3ed5-4e44-9485-81921239e1d1	5ad59103-4351-4aa0-a212-f0161547329c	ac489fd3-796e-4372-9791-f7ca3168ce65	2026-09-10 16:15:38.643
\.


--
-- Data for Name: SupplierPayment; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."SupplierPayment" (id, "supplierBillId", amount, method, notes, date, "createdAt", "updatedAt") FROM stdin;
08bbf317-898b-43e9-9e3b-83cda77e142c	09720077-2795-4e4c-b3d8-869ef9bf0565	4000	Bank Transfer	tst	2026-09-10 00:00:00	2026-09-10 17:22:13.74	2026-09-10 17:22:13.74
1a308579-fedc-495b-8c71-abc3fdaaf24c	653551a0-e8a5-468a-9354-7e8cb01965a2	3200	Bank Transfer	\N	2026-09-10 00:00:00	2026-09-10 17:31:07.768	2026-09-10 17:31:07.768
14d0e94a-54a8-4a4a-8edf-f01381b5f985	dc5b90d9-5de2-4658-9ba3-8570bd0a8ef0	700	Bank Transfer	Payment A concurrency race	2026-09-11 04:52:56.058	2026-09-11 04:52:56.058	2026-09-11 04:52:56.058
939a1c7f-2b66-4bc8-9108-7ffb8edd3aa1	25238208-8131-4000-8cc6-1a61a8a3be89	700	Bank Transfer	Payment A concurrency race	2026-09-11 04:53:42.95	2026-09-11 04:53:42.95	2026-09-11 04:53:42.95
c4a354b2-265b-4da9-9542-a047f5723794	782d9efe-ee3c-4d46-8161-af962bae0de7	700	Bank Transfer	Payment A concurrency race	2026-09-11 04:54:19.576	2026-09-11 04:54:19.576	2026-09-11 04:54:19.576
9ea6398c-f6b7-4148-805d-1973b2551745	1daac4d7-8163-45d2-ac12-df151edbd84b	700	Bank Transfer	Payment A concurrency race	2026-09-11 04:55:15.898	2026-09-11 04:55:15.898	2026-09-11 04:55:15.898
5878ec0e-627f-4fd4-90d3-b4530748a659	55facbe4-e196-450a-973c-33eebea5d735	700	Bank Transfer	Payment A concurrency race	2026-09-11 04:56:05.691	2026-09-11 04:56:05.691	2026-09-11 04:56:05.691
5614b827-c72e-4318-b5b8-efaaf4f6422e	49878ad2-bb21-44b9-8010-d3f6555bba36	700	Bank Transfer	Payment A concurrency race	2026-09-11 04:56:23.632	2026-09-11 04:56:23.632	2026-09-11 04:56:23.632
84b3f92a-68c2-4cfb-9b44-051d02ac3f68	924bc40a-3c8f-427b-806e-a1b1ae283385	700	Bank Transfer	Payment A concurrency race	2026-09-11 04:57:05.85	2026-09-11 04:57:05.85	2026-09-11 04:57:05.85
13e946c6-ed9b-4fe4-861c-7f2f6bc54d56	232225a5-a715-46f7-8efd-3978cecfa06c	4000	Bank Transfer	Supplier payment 1	2026-09-11 04:57:45.165	2026-09-11 04:57:45.165	2026-09-11 04:57:45.165
eb69bb01-157f-4f87-a069-ee7803a73ccb	232225a5-a715-46f7-8efd-3978cecfa06c	6000	UPI	Supplier payment 2 full settlement	2026-09-11 04:57:45.209	2026-09-11 04:57:45.209	2026-09-11 04:57:45.209
a8cb95ef-98b7-4567-82b3-e92fbafab2be	038de0dc-94b6-432c-b519-b78fbef9a0a4	4000	Bank Transfer	Supplier payment 1	2026-09-11 04:58:21.372	2026-09-11 04:58:21.372	2026-09-11 04:58:21.372
71b325da-9b95-45d9-811b-131cd7cadedf	038de0dc-94b6-432c-b519-b78fbef9a0a4	6000	UPI	Supplier payment 2 full settlement	2026-09-11 04:58:21.421	2026-09-11 04:58:21.421	2026-09-11 04:58:21.421
23613d3b-eb0b-49fa-8f59-b383495dd85a	d2269780-20ef-44ab-bb04-f84c10610909	700	Bank Transfer	Payment A concurrency race	2026-09-11 05:07:29.015	2026-09-11 05:07:29.016	2026-09-11 05:07:29.016
5aed2e73-732f-4ab3-a953-9b819a29c419	1012db52-f4f7-40aa-84d5-0fdfc41cce48	4000	Bank Transfer	Supplier payment 1	2026-09-11 05:07:38.726	2026-09-11 05:07:38.726	2026-09-11 05:07:38.726
5f156c01-e1fe-42f0-a822-b216aa054796	1012db52-f4f7-40aa-84d5-0fdfc41cce48	6000	UPI	Supplier payment 2 full settlement	2026-09-11 05:07:38.77	2026-09-11 05:07:38.771	2026-09-11 05:07:38.771
587828da-3423-4644-b5f5-468945076d7e	a388cd01-0f85-421a-a2e9-52e0ae94e793	4000	Bank Transfer	Supplier payment 1	2026-09-11 06:10:36.239	2026-09-11 06:10:36.24	2026-09-11 06:10:36.24
23a57627-d9a2-4043-aace-1b34018f5223	a388cd01-0f85-421a-a2e9-52e0ae94e793	6000	UPI	Supplier payment 2 full settlement	2026-09-11 06:10:36.28	2026-09-11 06:10:36.28	2026-09-11 06:10:36.28
\.


--
-- Data for Name: TreatmentCatalog; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."TreatmentCatalog" (id, category, name, variant, "isActive", "createdAt", "updatedAt") FROM stdin;
9c367ec7-8dd4-4b00-b669-749c6a21cf2c	Consultation	Consultation	\N	t	2026-09-08 07:54:44.628	2026-09-08 07:54:44.628
16f850d6-91fe-4664-a907-35d4fa286238	Diagnostic	X-ray	\N	t	2026-09-08 07:54:44.642	2026-09-08 07:54:44.642
e6d03791-ca8c-4a56-b40c-b08b21801b98	Diagnostic	Diagnostic	\N	t	2026-09-08 07:54:44.649	2026-09-08 07:54:44.649
0d4ceb79-7bc7-4289-afea-c894b1c3c0fc	Scaling & Curettage	Scaling & Curettage	\N	t	2026-09-08 07:54:44.656	2026-09-08 07:54:44.656
2a85199c-4325-4610-94a5-702530a06da8	Fillings	Silver Amalgam	\N	t	2026-09-08 07:54:44.664	2026-09-08 07:54:44.664
fccd5d49-41a3-4eff-8df6-4e4dbdd2cc23	Fillings	Composite	\N	t	2026-09-08 07:54:44.67	2026-09-08 07:54:44.67
28008ba7-cc76-40cc-877b-25a41751647f	Extraction	Extraction	\N	t	2026-09-08 07:54:44.676	2026-09-08 07:54:44.676
f0efb564-2a76-4c17-9b91-fcc72e44b3d9	Extraction	Surgical Extraction	\N	t	2026-09-08 07:54:44.681	2026-09-08 07:54:44.681
8ef0a082-6905-4d46-aa00-9bf88c15f92c	Endodontics	Root Canal Treatment	\N	t	2026-09-08 07:54:44.689	2026-09-08 07:54:44.689
34ba6c11-e47b-4577-aca1-5d9d4c60cc5b	Crowns	Full Ceramic	\N	t	2026-09-08 07:54:44.697	2026-09-08 07:54:44.697
3f77fb4f-23a3-4d70-a1ee-b8f0d5c430dd	Crowns	Facing Ceramic	\N	t	2026-09-08 07:54:44.703	2026-09-08 07:54:44.703
db2adff8-db97-4332-a40e-4f7da78ce042	Crowns	Zirconia	Basic	t	2026-09-08 07:54:44.711	2026-09-08 07:54:44.711
07e84f50-8599-4ebd-b617-6ae61462f6f2	Crowns	Zirconia	Classic	t	2026-09-08 07:54:44.717	2026-09-08 07:54:44.717
55d9027d-0fcf-4357-94d4-6a3b537c0f40	Crowns	Zirconia	Premium	t	2026-09-08 07:54:44.726	2026-09-08 07:54:44.726
e764f5f7-a3b7-4ba2-8d59-35009d4a2b17	Crowns	Acrylic Crown	\N	t	2026-09-08 07:54:44.734	2026-09-08 07:54:44.734
68c1593c-f2d9-4ef8-9acf-49d1475a478c	Prosthetic Dentures	Complete Denture	Acrylic	t	2026-09-08 07:54:44.741	2026-09-08 07:54:44.741
cfc221d8-fec7-4630-8d5a-cfed993b5077	Prosthetic Dentures	Complete Denture	Sunflex	t	2026-09-08 07:54:44.748	2026-09-08 07:54:44.748
d5bec2f7-72ef-46b2-ae59-41454528a4dc	Prosthetic Dentures	Partial Denture	Acrylic	t	2026-09-08 07:54:44.755	2026-09-08 07:54:44.755
9c3caa5f-45da-4dd3-962b-84cca75476b9	Prosthetic Dentures	Partial Denture	Sunflex	t	2026-09-08 07:54:44.762	2026-09-08 07:54:44.762
eaa59ce0-a629-4787-92dd-0acf0dc037f9	Ortho	Fixed Appliance	\N	t	2026-09-08 07:54:44.769	2026-09-08 07:54:44.769
807336f1-9d44-4fb5-8859-aaa4be41baf1	Ortho	Removable Appliance	\N	t	2026-09-08 07:54:44.781	2026-09-08 07:54:44.781
403b28ec-5136-42df-929b-e4e215a5c386	Implants	Dental Implants	\N	t	2026-09-08 07:54:44.791	2026-09-08 07:54:44.791
trt-rct-molar	Endodontics	Root Canal Treatment	Molar (3-4 Canals)	t	2026-09-09 09:31:58.584	2026-09-09 09:31:58.584
trt-zirconia-crown	Prosthodontics	Zirconia Crown Placement	Monolithic High Translucency	t	2026-09-09 09:31:58.599	2026-09-09 09:31:58.599
trt-scaling-polishing	Periodontics	Full Mouth Scaling & Deep Ultrasonic Polishing	Full Mouth	t	2026-09-09 09:31:58.612	2026-09-09 09:31:58.612
trt-composite-restoration	Restorative	Composite Resin Restoration (Class II)	Premolar / Molar	t	2026-09-09 09:31:58.628	2026-09-09 09:31:58.628
\.


--
-- Data for Name: TreatmentPlan; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."TreatmentPlan" (id, "patientId", "createdAt", "updatedAt") FROM stdin;
f417809b-83da-4276-8411-748a759afb46	1b4455bc-9405-44a8-8b5b-88e9660e0a83	2026-09-10 16:59:03.133	2026-09-10 16:59:03.133
f836dac2-81ca-4a56-87e8-0d38fd7e4169	1b7c239f-02c0-414c-aa46-fb211b3ed7e4	2026-09-11 04:43:55.597	2026-09-11 04:43:55.597
a046e33e-a7c9-4d05-a5d3-03d145e558e0	e9a1dbef-e0ac-46eb-ab3c-999997beca59	2026-09-11 04:45:23.532	2026-09-11 04:45:23.532
a0475a65-5a15-4108-8b08-431b23ddefcc	0dbdf4cb-844c-42e5-9e8e-ced6df9d734c	2026-09-11 04:46:21.496	2026-09-11 04:46:21.496
833cbd4b-592c-4952-bfd5-37bde1fcf6d4	2ad6a29d-8ffa-44b7-9332-68a4a8e26314	2026-09-11 05:00:45.846	2026-09-11 05:00:45.846
8b9b2ab3-4abd-4ffc-8dbd-7226338ca129	e9f83b68-094f-419f-a47b-ce86d3661f12	2026-09-11 05:04:47.07	2026-09-11 05:04:47.07
609f224b-b70b-45d1-be85-c2d5d3cabc69	ca8769be-e3c5-402b-ac5c-9a1be8837198	2026-09-11 05:05:46.344	2026-09-11 05:05:46.344
55b14fda-b7e4-4e81-851f-c096b6cbadf3	5a8bd431-40d5-49f6-923f-94df0809b0b8	2026-09-11 05:07:58.472	2026-09-11 05:07:58.472
9a70b8ef-e733-4144-a9e8-b4522f8479da	e3ab0012-9284-46e7-9057-00002e5a8608	2026-09-11 06:07:44.764	2026-09-11 06:07:44.764
0cf57c99-2a45-4c81-a74b-1f61539821d6	6c7210c5-1a05-4ff7-8872-56b94f531bfe	2026-09-11 06:08:41.702	2026-09-11 06:08:41.702
469071a8-c6c5-416c-80dd-505d1a8823cd	e61ce2a2-9426-4b86-a55f-123787152d9c	2026-09-11 06:10:52.799	2026-09-11 06:10:52.799
\.


--
-- Data for Name: TreatmentPlanItem; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."TreatmentPlanItem" (id, "treatmentPlanId", "treatmentCatalogId", status, notes, "completedVisitId", "completedAt", "createdAt", "updatedAt") FROM stdin;
4b3c8429-7fd3-4813-8698-f5fc0ebebf54	f417809b-83da-4276-8411-748a759afb46	e764f5f7-a3b7-4ba2-8d59-35009d4a2b17	Completed	36	3e4a428a-6bd0-4cf2-b3aa-e41c5db7feff	2026-09-10 16:59:21.998	2026-09-10 16:59:22.003	2026-09-10 16:59:22.003
c3701115-7b11-4864-a358-abc0ce99816a	833cbd4b-592c-4952-bfd5-37bde1fcf6d4	9c367ec7-8dd4-4b00-b669-749c6a21cf2c	Completed	Planned root canal therapy session 1	\N	2026-09-11 05:00:45.852	2026-09-11 05:00:45.857	2026-09-11 05:00:45.857
dbb3ac32-4590-46cd-bcdb-08a8c3568173	55b14fda-b7e4-4e81-851f-c096b6cbadf3	9c367ec7-8dd4-4b00-b669-749c6a21cf2c	Completed	Planned root canal therapy session 1	\N	2026-09-11 05:07:58.475	2026-09-11 05:07:58.477	2026-09-11 05:07:58.477
dc945343-2586-45f7-89af-736124fdf2c2	469071a8-c6c5-416c-80dd-505d1a8823cd	9c367ec7-8dd4-4b00-b669-749c6a21cf2c	Completed	Planned root canal therapy session 1	\N	2026-09-11 06:10:52.805	2026-09-11 06:10:52.807	2026-09-11 06:10:52.807
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."User" (id, username, "passwordHash", role, "staffId", "createdAt", "updatedAt") FROM stdin;
9207b7fd-593f-4ec6-b3a8-9034f9ceb1f1	headdoctor	$2b$10$EflJ59N8CySRK7stjz34sOOW.DDS6voXw3dpdcgwTPhMC1aSrYV8m	Head Doctor	881dcbef-2971-4255-a110-7e840554e133	2026-09-07 15:21:52.721	2026-09-08 17:35:08.833
4da019a4-85ed-4adc-97d8-1408918792b6	receptionist	$2b$10$tKiUHmVTEs.jz2zNuuZci.SRWwgwKj0cIcGYxgFUX1Ft/lUDeb3Ri	Receptionist	47d93f66-98e3-41d2-b206-751424965018	2026-09-10 16:11:54.456	2026-09-10 16:11:54.456
755dc883-1394-4372-ade9-7674a10b8250	Yokesh	$2b$10$iVdwMXqRNQtWHNnXgr4pROUYCQojxadAOaEnlsdnDFUVuPHVTKI6W	Duty Doctor	66b9ace7-2946-495b-9d31-235628f64a25	2026-09-10 16:24:57.778	2026-09-10 16:24:57.778
3a23a202-fe5b-477b-ba23-d7d27f5a89fc	irfan	$2b$10$i8YbnxeU5cbwps/aI2/M5u6FOa7O41akXUufXFCck5DMTCZmYQSay	Duty Doctor	bf093e95-f5ac-4218-af5d-33117e3a669d	2026-09-10 16:25:18.074	2026-09-10 16:25:18.074
3c972b20-681a-45a9-867e-b1d3966e9481	dutydoctor	$2b$10$gOvgLRkV3FncldEFSVjOIuP7Yid21Ej7mif4HRTj3qBK5X3sWZ5pK	Duty Doctor	81033cf6-ca0e-4138-af43-7b7c2e414254	2026-09-11 04:40:38.523	2026-09-11 04:40:38.523
\.


--
-- Data for Name: Visit; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public."Visit" (id, "patientId", "doctorId", "appointmentId", status, "amountDue", "consultationFee", "treatmentFee", "medicineCost", "reasonForVisit", "createdAt", "updatedAt") FROM stdin;
1f774e84-8b65-44dc-80be-1cff48700244	2ad6a29d-8ffa-44b7-9332-68a4a8e26314	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_RECEPTION	400	400	0	\N	Consultation and Plan	2026-09-11 05:00:45.649	2026-09-11 05:00:45.962
8b170a1c-74ea-4c1b-a706-a128e2043142	78be3d72-3bab-45d1-8327-fc9c096484c6	bf093e95-f5ac-4218-af5d-33117e3a669d	\N	WAITING	1500	\N	\N	\N	Consultation Race	2026-09-11 04:55:17.194	2026-09-11 04:55:17.234
3e4a428a-6bd0-4cf2-b3aa-e41c5db7feff	1b4455bc-9405-44a8-8b5b-88e9660e0a83	66b9ace7-2946-495b-9d31-235628f64a25	\N	COMPLETED	5410	500	4590	320	Toothache	2026-09-10 16:51:43.034	2026-09-10 17:03:41.058
0aec7dcb-36f4-4b24-8581-1afd7d1818e9	c75f0db0-aa4e-4d1f-a380-730b50599694	\N	6dd17c5e-d470-400d-9475-8b95b063cd05	CANCELLED	1500	\N	\N	\N	Cleaning	2026-09-10 16:52:04.268	2026-09-10 17:03:50.153
7a9d947e-8e2d-4798-8713-8462efa6b5b9	b42ebfea-4165-4a60-b0a4-f032ca096c5f	\N	\N	CANCELLED	1500	\N	\N	\N	[Transferred to 2026-09-11] Toothache	2026-09-10 16:56:45.382	2026-09-10 17:03:59.908
e6450da2-b92e-4bad-a889-4ac0e7d1a978	1b8314c0-ce8a-4fba-aef2-fda7f8fa5516	\N	\N	CANCELLED	1500	\N	\N	\N	General Consultation	2026-09-11 04:42:34.929	2026-09-11 04:42:36.811
50e99a6a-f657-4782-a2c7-40a7fc4b15e5	9a051b02-a36a-410b-991f-cd2a40bb3590	\N	\N	WAITING	1500	\N	\N	\N	General Consultation	2026-09-11 04:42:58.813	2026-09-11 04:42:58.813
32a95191-ffbb-48b4-b70c-3afa5095f103	45285db8-f33b-43f2-b3de-93a11fa49125	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	WAITING	1500	\N	\N	\N	Tooth Pain	2026-09-11 04:56:05.907	2026-09-11 04:56:05.944
e8065343-0973-46f2-8eac-8cc3e09202c1	82c90d5e-afd1-41cb-8cfb-03ac1d119df5	\N	\N	WAITING	1500	\N	\N	\N	First Visit	2026-09-11 05:00:46.389	2026-09-11 05:00:46.389
d210dcef-c0c1-4852-ae06-01c99f584d83	1b7c239f-02c0-414c-aa46-fb211b3ed7e4	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_PAYMENT	580	500	0	80	General Consultation	2026-09-11 04:43:39.204	2026-09-11 04:44:08.501
33e107e7-a92f-4bea-932d-02c3c765149f	ea149153-ec4f-484c-bcd9-aa5dc7d04003	bf093e95-f5ac-4218-af5d-33117e3a669d	\N	WAITING	1500	\N	\N	\N	Consultation Race	2026-09-11 04:56:07.21	2026-09-11 04:56:07.253
a9c1d963-0a66-4516-9a68-8ba415e08273	f0d1c33b-3ec5-4ab1-97f2-3101e8a62cfc	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	WAITING	1500	\N	\N	\N	Tooth Pain	2026-09-11 04:56:23.814	2026-09-11 04:56:23.847
a4c08a25-1f94-43ad-b2a2-c02c5d0b65ed	e9a1dbef-e0ac-46eb-ab3c-999997beca59	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	COMPLETED	580	500	0	80	General Consultation	2026-09-11 04:45:06.854	2026-09-11 04:45:37.521
5dfa61e1-bd32-4fe4-ba11-1c4df2835be5	0dbdf4cb-844c-42e5-9e8e-ced6df9d734c	\N	\N	WAITING	1500	\N	\N	\N	General Consultation	2026-09-11 04:46:16.276	2026-09-11 04:46:16.276
ccf9b790-c138-4a9f-af35-b7caf812bad8	73c365ff-12db-41d5-a0e2-04b47b448550	\N	\N	WAITING	1500	\N	\N	\N	Tooth Pain	2026-09-11 04:53:43.171	2026-09-11 04:53:43.171
68b34141-771c-4efd-9b7a-243e29e04828	3ecef4ed-2ee5-4385-ab99-3a69d94b6c59	\N	\N	WAITING	1500	\N	\N	\N	Consultation Race	2026-09-11 04:53:44.432	2026-09-11 04:53:44.432
5b4d9dd9-9e1d-4268-8a21-7b1361e5430a	6e711cce-4e61-4fcd-b0ff-7e7fccd655a3	\N	\N	WAITING	1500	\N	\N	\N	Pre-cancellation audit	2026-09-11 05:01:14.338	2026-09-11 05:01:14.338
4b6314be-bc68-484d-8ad9-996ada4e271a	d57dd7ff-cd1e-499a-92fc-ad82f71dcaf2	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	WAITING	500	\N	\N	\N	Tooth Pain	2026-09-11 04:54:19.796	2026-09-11 04:54:19.906
358fd18f-a1fb-421f-b787-f31e3b09741d	233e75f8-581d-4d34-bb5d-740cea2e1ba5	bf093e95-f5ac-4218-af5d-33117e3a669d	\N	WAITING	1500	\N	\N	\N	Consultation Race	2026-09-11 04:56:25.177	2026-09-11 04:56:25.22
2eb369ab-95c3-4b17-9463-0a7098a80363	a4e4ec34-3896-41df-8a02-393fd9f6b32e	bf093e95-f5ac-4218-af5d-33117e3a669d	\N	WAITING	1500	\N	\N	\N	Consultation Race	2026-09-11 04:54:21.078	2026-09-11 04:54:21.128
1763e5cf-5e25-4315-9926-90c37a622597	0df6f8f8-4f99-4a99-be28-eb0de22e9db1	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_RECEPTION	1700	500	1200	\N	Root Canal	2026-09-11 04:57:42.35	2026-09-11 04:57:42.594
3b498efb-fe9f-42f3-afee-3436457c7cfd	21e75c24-c3a8-4be8-b4b1-bec738d6062a	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	WAITING	500	\N	\N	\N	Tooth Pain	2026-09-11 04:55:16.078	2026-09-11 04:55:16.164
31cb976e-f788-4fa8-8748-99fbea33c2c6	0f565536-8212-4718-859a-d107930b1316	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	WAITING	1500	\N	\N	\N	Tooth Pain	2026-09-11 04:56:46.832	2026-09-11 04:56:46.879
bd2d42a4-b267-407b-968d-365a1a12d60c	f085b94d-5340-4078-ad96-b3baaa7d77ff	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	COMPLETED	1000	500	500	\N	Cleaning	2026-09-11 04:58:20.671	2026-09-11 04:58:21.117
51bec9f1-9305-42b8-8098-fde8ffa08330	cc93dcb5-f735-4d10-a17d-989f75d0dcfd	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_RECEPTION	500	500	0	\N	Tooth Pain	2026-09-11 04:57:06.06	2026-09-11 04:57:06.269
38dd4f47-0a64-474d-9702-1ff6c12eb2d8	decc1c95-2908-4280-b49c-0c770432421b	bf093e95-f5ac-4218-af5d-33117e3a669d	\N	WAITING	1500	\N	\N	\N	Consultation Race	2026-09-11 04:57:06.616	2026-09-11 04:57:06.657
6974b354-8083-410c-b59b-4c9e95d745d6	22aec114-39c4-4198-87e6-d9fffa1a682f	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_RECEPTION	1000	500	500	\N	Cleaning	2026-09-11 04:57:43.625	2026-09-11 04:57:43.822
ba8ea7dc-c4b0-4b09-9abb-a06a990b8064	7133d662-2490-4f79-9c7d-81197e59ae8f	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	WITH_DOCTOR	1500	\N	\N	\N	Consultation and Plan	2026-09-11 05:00:29.037	2026-09-11 05:00:29.185
6409d006-c229-47ff-8d6e-68b6632ebf0b	eef65a9a-b0d5-4447-998f-af3f8a3a231d	\N	\N	WAITING	1500	\N	\N	\N	First Visit	2026-09-11 05:00:30.27	2026-09-11 05:00:30.27
3b377652-72ba-4234-ba0a-afd82da9df6e	ec59b833-cf68-4757-bf2c-28b08281e6e6	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_RECEPTION	1700	500	1200	\N	Root Canal	2026-09-11 04:58:20.193	2026-09-11 04:58:20.391
b0acd5b2-9966-43ed-a9da-5f419d3f4e8e	b0d7859c-5255-4660-9afb-d124db94d68a	\N	\N	CANCELLED	1500	\N	\N	\N	General Consultation	2026-09-11 05:04:15.705	2026-09-11 05:04:17.609
e783c34f-9b06-4568-8ac8-1728b7ea3121	980636b4-74f4-47c6-8df4-1110e0412d4d	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	CANCELLED	300	300	0	\N	Pre-cancellation audit	2026-09-11 05:02:30.452	2026-09-11 05:02:30.81
d2ac6adb-f65a-45a7-be7f-df0d8f7f0e35	e9f83b68-094f-419f-a47b-ce86d3661f12	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	COMPLETED	525	500	0	25	General Consultation	2026-09-11 05:04:30.034	2026-09-11 05:05:02.379
640acc8f-5eff-44db-82bd-387590b3d32b	ca8769be-e3c5-402b-ac5c-9a1be8837198	\N	\N	WAITING	1500	\N	\N	\N	General Consultation	2026-09-11 05:05:40.733	2026-09-11 05:05:40.733
fd6ff133-c11f-4bce-9025-9334f4a7dac3	1a26a346-0f34-40d4-a2ff-2350ab26098f	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	COMPLETED	300	300	0	\N	Pre-cancellation audit	2026-09-11 05:02:04.58	2026-09-11 05:07:08.452
1a8375f4-e496-44c0-95c4-9ca75c230a5f	baf2dcc9-c2ea-4d7e-b4f3-8aa6cae5d305	bf093e95-f5ac-4218-af5d-33117e3a669d	\N	WAITING	1500	\N	\N	\N	Consultation Race	2026-09-11 05:07:29.788	2026-09-11 05:07:29.829
21e3c118-7843-4b33-b823-82b334b614a0	ff0e9d09-224e-4f74-a613-6195c6e546bd	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_RECEPTION	1700	500	1200	\N	Root Canal	2026-09-11 05:07:37.6	2026-09-11 05:07:37.82
ab25bcb2-ae80-41c5-b3a5-f1089e665b32	c19a7cb3-5aaa-46d6-9644-bd1b34c1bc78	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	COMPLETED	500	500	0	\N	Tooth Pain	2026-09-11 05:07:29.214	2026-09-11 06:10:09.426
8519c1de-5fe2-4c0e-9ad0-0aeaf8c71c70	e61ce2a2-9426-4b86-a55f-123787152d9c	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_RECEPTION	400	400	0	\N	Consultation and Plan	2026-09-11 06:10:52.629	2026-09-11 06:10:52.86
d45fe62e-0cfe-4601-8733-45e422c6ca86	d0857fca-4445-418e-9f29-b60e4a41160c	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	COMPLETED	1000	500	500	\N	Cleaning	2026-09-11 05:07:38.106	2026-09-11 05:07:38.491
7c8867af-6ce5-4e3e-80f9-69f1dd14f443	4f33cec2-5db3-4bd5-91e6-366af5ce5c6c	\N	\N	WAITING	1500	\N	\N	\N	First Visit	2026-09-11 06:10:53.174	2026-09-11 06:10:53.174
7459a9fb-550b-45bb-8b61-4a49c038e974	5a8bd431-40d5-49f6-923f-94df0809b0b8	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_RECEPTION	400	400	0	\N	Consultation and Plan	2026-09-11 05:07:58.292	2026-09-11 05:07:58.538
209f2b62-b4fd-4e87-adcd-a039024650f6	fd95f70c-b7e6-4cf8-bd26-cc444cd94b50	\N	\N	WAITING	1500	\N	\N	\N	First Visit	2026-09-11 05:07:58.852	2026-09-11 05:07:58.852
c29c0802-0248-4dfa-8cc1-7bf692d4ccf9	e1013964-d626-48d4-a1f2-00bf9a913621	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	CANCELLED	300	300	0	\N	Pre-cancellation audit	2026-09-11 05:08:06.744	2026-09-11 05:08:07.057
4882f6bb-d210-45cd-b076-8ae4755d02f8	2fc5523e-064b-4af5-b8c9-76d6b5ed4c68	\N	\N	CANCELLED	1500	\N	\N	\N	General Consultation	2026-09-11 06:07:09.133	2026-09-11 06:07:12.35
95b0d234-093e-4d24-ad4f-ec6bdbca3a67	e3ab0012-9284-46e7-9057-00002e5a8608	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	COMPLETED	525	500	0	25	General Consultation	2026-09-11 06:07:27.891	2026-09-11 06:07:58.663
39b3bc0c-0448-4488-81f3-cbab9543bf0a	6c7210c5-1a05-4ff7-8872-56b94f531bfe	\N	\N	WAITING	1500	\N	\N	\N	General Consultation	2026-09-11 06:08:36.01	2026-09-11 06:08:36.01
6c72b8a4-2aa3-4023-9767-e54e489b069c	8b5e8de3-b5f1-457c-b97f-e16399e99ccf	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	READY_FOR_RECEPTION	1700	500	1200	\N	Root Canal	2026-09-11 06:10:35.088	2026-09-11 06:10:35.312
26e8333c-2f09-4863-a9da-a69f43272a69	f8f1dd29-2ee8-4a67-ad2c-663fa10f4756	81033cf6-ca0e-4138-af43-7b7c2e414254	\N	COMPLETED	1000	500	500	\N	Cleaning	2026-09-11 06:10:35.595	2026-09-11 06:10:36.028
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: dental
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2420d2bb-cb0f-42d4-b909-cba3564c7dae	526cf301f23cca931caab5e2ca35efdd85932402123e1db1872e901095e9336c	2026-09-11 06:34:45.172168+00	20260828160600_init		\N	2026-09-11 06:34:45.172168+00	0
\.


--
-- Name: Appointment Appointment_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_pkey" PRIMARY KEY (id);


--
-- Name: Consultation Consultation_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Consultation"
    ADD CONSTRAINT "Consultation_pkey" PRIMARY KEY (id);


--
-- Name: DispensingItem DispensingItem_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."DispensingItem"
    ADD CONSTRAINT "DispensingItem_pkey" PRIMARY KEY (id);


--
-- Name: Dispensing Dispensing_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Dispensing"
    ADD CONSTRAINT "Dispensing_pkey" PRIMARY KEY (id);


--
-- Name: MedicineCategory MedicineCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."MedicineCategory"
    ADD CONSTRAINT "MedicineCategory_pkey" PRIMARY KEY (id);


--
-- Name: Medicine Medicine_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Medicine"
    ADD CONSTRAINT "Medicine_pkey" PRIMARY KEY (id);


--
-- Name: Patient Patient_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "Patient_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PrescriptionItem PrescriptionItem_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."PrescriptionItem"
    ADD CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY (id);


--
-- Name: Prescription Prescription_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Prescription"
    ADD CONSTRAINT "Prescription_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseOrderItem PurchaseOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseOrder PurchaseOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY (id);


--
-- Name: QueueEntry QueueEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."QueueEntry"
    ADD CONSTRAINT "QueueEntry_pkey" PRIMARY KEY (id);


--
-- Name: Staff Staff_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: SupplierBill SupplierBill_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."SupplierBill"
    ADD CONSTRAINT "SupplierBill_pkey" PRIMARY KEY (id);


--
-- Name: SupplierMedicineCategory SupplierMedicineCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."SupplierMedicineCategory"
    ADD CONSTRAINT "SupplierMedicineCategory_pkey" PRIMARY KEY (id);


--
-- Name: SupplierPayment SupplierPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."SupplierPayment"
    ADD CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: TreatmentCatalog TreatmentCatalog_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."TreatmentCatalog"
    ADD CONSTRAINT "TreatmentCatalog_pkey" PRIMARY KEY (id);


--
-- Name: TreatmentPlanItem TreatmentPlanItem_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."TreatmentPlanItem"
    ADD CONSTRAINT "TreatmentPlanItem_pkey" PRIMARY KEY (id);


--
-- Name: TreatmentPlan TreatmentPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."TreatmentPlan"
    ADD CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Visit Visit_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Visit"
    ADD CONSTRAINT "Visit_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Consultation_visitId_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "Consultation_visitId_key" ON public."Consultation" USING btree ("visitId");


--
-- Name: Dispensing_prescriptionId_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "Dispensing_prescriptionId_key" ON public."Dispensing" USING btree ("prescriptionId");


--
-- Name: Dispensing_visitId_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "Dispensing_visitId_key" ON public."Dispensing" USING btree ("visitId");


--
-- Name: MedicineCategory_name_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "MedicineCategory_name_key" ON public."MedicineCategory" USING btree (name);


--
-- Name: Patient_phone_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "Patient_phone_key" ON public."Patient" USING btree (phone);


--
-- Name: Prescription_visitId_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "Prescription_visitId_key" ON public."Prescription" USING btree ("visitId");


--
-- Name: PurchaseOrder_orderNumber_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "PurchaseOrder_orderNumber_key" ON public."PurchaseOrder" USING btree ("orderNumber");


--
-- Name: QueueEntry_visitId_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "QueueEntry_visitId_key" ON public."QueueEntry" USING btree ("visitId");


--
-- Name: SupplierMedicineCategory_supplierId_medicineCategoryId_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "SupplierMedicineCategory_supplierId_medicineCategoryId_key" ON public."SupplierMedicineCategory" USING btree ("supplierId", "medicineCategoryId");


--
-- Name: TreatmentPlan_patientId_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "TreatmentPlan_patientId_key" ON public."TreatmentPlan" USING btree ("patientId");


--
-- Name: User_staffId_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "User_staffId_key" ON public."User" USING btree ("staffId");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Visit_appointmentId_key; Type: INDEX; Schema: public; Owner: dental
--

CREATE UNIQUE INDEX "Visit_appointmentId_key" ON public."Visit" USING btree ("appointmentId");


--
-- Name: Consultation Consultation_visitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Consultation"
    ADD CONSTRAINT "Consultation_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES public."Visit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DispensingItem DispensingItem_dispensingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."DispensingItem"
    ADD CONSTRAINT "DispensingItem_dispensingId_fkey" FOREIGN KEY ("dispensingId") REFERENCES public."Dispensing"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DispensingItem DispensingItem_medicineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."DispensingItem"
    ADD CONSTRAINT "DispensingItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES public."Medicine"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispensing Dispensing_prescriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Dispensing"
    ADD CONSTRAINT "Dispensing_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES public."Prescription"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispensing Dispensing_visitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Dispensing"
    ADD CONSTRAINT "Dispensing_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES public."Visit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Medicine Medicine_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Medicine"
    ADD CONSTRAINT "Medicine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."MedicineCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_visitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES public."Visit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PrescriptionItem PrescriptionItem_medicineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."PrescriptionItem"
    ADD CONSTRAINT "PrescriptionItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES public."Medicine"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PrescriptionItem PrescriptionItem_prescriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."PrescriptionItem"
    ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES public."Prescription"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Prescription Prescription_visitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Prescription"
    ADD CONSTRAINT "Prescription_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES public."Visit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseOrderItem PurchaseOrderItem_medicineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES public."Medicine"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseOrderItem PurchaseOrderItem_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public."PurchaseOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PurchaseOrder PurchaseOrder_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QueueEntry QueueEntry_visitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."QueueEntry"
    ADD CONSTRAINT "QueueEntry_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES public."Visit"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_medicineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES public."Medicine"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SupplierBill SupplierBill_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."SupplierBill"
    ADD CONSTRAINT "SupplierBill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public."PurchaseOrder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SupplierBill SupplierBill_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."SupplierBill"
    ADD CONSTRAINT "SupplierBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SupplierMedicineCategory SupplierMedicineCategory_medicineCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."SupplierMedicineCategory"
    ADD CONSTRAINT "SupplierMedicineCategory_medicineCategoryId_fkey" FOREIGN KEY ("medicineCategoryId") REFERENCES public."MedicineCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SupplierMedicineCategory SupplierMedicineCategory_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."SupplierMedicineCategory"
    ADD CONSTRAINT "SupplierMedicineCategory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SupplierPayment SupplierPayment_supplierBillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."SupplierPayment"
    ADD CONSTRAINT "SupplierPayment_supplierBillId_fkey" FOREIGN KEY ("supplierBillId") REFERENCES public."SupplierBill"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TreatmentPlanItem TreatmentPlanItem_completedVisitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."TreatmentPlanItem"
    ADD CONSTRAINT "TreatmentPlanItem_completedVisitId_fkey" FOREIGN KEY ("completedVisitId") REFERENCES public."Visit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TreatmentPlanItem TreatmentPlanItem_treatmentCatalogId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."TreatmentPlanItem"
    ADD CONSTRAINT "TreatmentPlanItem_treatmentCatalogId_fkey" FOREIGN KEY ("treatmentCatalogId") REFERENCES public."TreatmentCatalog"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TreatmentPlanItem TreatmentPlanItem_treatmentPlanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."TreatmentPlanItem"
    ADD CONSTRAINT "TreatmentPlanItem_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES public."TreatmentPlan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TreatmentPlan TreatmentPlan_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."TreatmentPlan"
    ADD CONSTRAINT "TreatmentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Visit Visit_appointmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Visit"
    ADD CONSTRAINT "Visit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES public."Appointment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Visit Visit_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dental
--

ALTER TABLE ONLY public."Visit"
    ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: dental
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict StS4BCzISz6bM1OOPkKd97sPLLHAdE6jIW0eBcd9r6JTI4LMF9GkcPqAG12zRWu

