-- AlterTable
ALTER TABLE "TreatmentPlanItem" ADD COLUMN IF NOT EXISTS "totalSittings" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TreatmentSession" (
    "id" TEXT NOT NULL,
    "treatmentPlanItemId" TEXT NOT NULL,
    "sittingNumber" INTEGER NOT NULL,
    "stage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "plannedDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "visitId" TEXT,
    "doctorId" TEXT,
    "clinicalNotes" TEXT,
    "workPerformed" TEXT,
    "materialsUsed" TEXT,
    "nextSittingDate" TIMESTAMP(3),
    "followUpInstructions" TEXT,
    "fee" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TreatmentSession_treatmentPlanItemId_sittingNumber_key" ON "TreatmentSession"("treatmentPlanItemId", "sittingNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TreatmentSession_treatmentPlanItemId_idx" ON "TreatmentSession"("treatmentPlanItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TreatmentSession_visitId_idx" ON "TreatmentSession"("visitId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TreatmentSession_treatmentPlanItemId_fkey'
    ) THEN
        ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_treatmentPlanItemId_fkey" FOREIGN KEY ("treatmentPlanItemId") REFERENCES "TreatmentPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TreatmentSession_visitId_fkey'
    ) THEN
        ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TreatmentSession_doctorId_fkey'
    ) THEN
        ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
