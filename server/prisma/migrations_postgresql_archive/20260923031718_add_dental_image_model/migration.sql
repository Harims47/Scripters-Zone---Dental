-- CreateEnum
CREATE TYPE "DentalImageType" AS ENUM ('OPG', 'RVG');

-- CreateTable
CREATE TABLE "DentalImage" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "toothNumber" INTEGER,
    "type" "DentalImageType" NOT NULL,
    "title" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentalImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DentalImage_patientId_idx" ON "DentalImage"("patientId");

-- CreateIndex
CREATE INDEX "DentalImage_visitId_idx" ON "DentalImage"("visitId");

-- CreateIndex
CREATE INDEX "DentalImage_type_idx" ON "DentalImage"("type");

-- CreateIndex
CREATE INDEX "DentalImage_toothNumber_idx" ON "DentalImage"("toothNumber");

-- AddForeignKey
ALTER TABLE "DentalImage" ADD CONSTRAINT "DentalImage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DentalImage" ADD CONSTRAINT "DentalImage_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
