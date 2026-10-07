-- AlterTable
ALTER TABLE `Appointment` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `Consultation` MODIFY `reasonForVisit` TEXT NOT NULL,
    MODIFY `clinicalNotes` TEXT NOT NULL,
    MODIFY `consultationWaiverReason` TEXT NULL,
    MODIFY `treatmentWaiverReason` TEXT NULL;

-- AlterTable
ALTER TABLE `Patient` MODIFY `address` TEXT NULL;

-- AlterTable
ALTER TABLE `Payment` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `Prescription` MODIFY `notes` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `PrescriptionItem` MODIFY `instructions` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `PurchaseOrder` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `StockMovement` MODIFY `reason` TEXT NULL;

-- AlterTable
ALTER TABLE `Supplier` MODIFY `address` TEXT NULL;

-- AlterTable
ALTER TABLE `SupplierBill` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `SupplierPayment` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `TreatmentPlanItem` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `Visit` MODIFY `discountReason` TEXT NULL,
    MODIFY `reasonForVisit` TEXT NULL;
