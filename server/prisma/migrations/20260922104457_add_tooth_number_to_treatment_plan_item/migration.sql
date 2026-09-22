-- AlterTable
ALTER TABLE "TreatmentPlanItem" ADD COLUMN     "toothNumber" INTEGER;

-- CreateIndex
CREATE INDEX "TreatmentPlanItem_toothNumber_idx" ON "TreatmentPlanItem"("toothNumber");
