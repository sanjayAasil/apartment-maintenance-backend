-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MaintenanceHistoryAction" ADD VALUE 'WORK_NOTE_CREATED';
ALTER TYPE "MaintenanceHistoryAction" ADD VALUE 'WORK_NOTE_UPDATED';
ALTER TYPE "MaintenanceHistoryAction" ADD VALUE 'PART_ADDED';
ALTER TYPE "MaintenanceHistoryAction" ADD VALUE 'PART_REMOVED';

-- CreateTable
CREATE TABLE "MaintenanceWorkNote" (
    "id" UUID NOT NULL,
    "maintenanceRequestId" UUID NOT NULL,
    "technicianId" UUID NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "workPerformed" TEXT NOT NULL,
    "laborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceWorkNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRequestPart" (
    "id" UUID NOT NULL,
    "maintenanceRequestId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRequestPart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceWorkNote_maintenanceRequestId_key" ON "MaintenanceWorkNote"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "MaintenanceWorkNote_technicianId_idx" ON "MaintenanceWorkNote"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "Part_name_key" ON "Part"("name");

-- CreateIndex
CREATE INDEX "Part_isActive_idx" ON "Part"("isActive");

-- CreateIndex
CREATE INDEX "Part_quantity_idx" ON "Part"("quantity");

-- CreateIndex
CREATE INDEX "MaintenanceRequestPart_maintenanceRequestId_idx" ON "MaintenanceRequestPart"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "MaintenanceRequestPart_partId_idx" ON "MaintenanceRequestPart"("partId");

-- CreateIndex
CREATE INDEX "MaintenanceRequestPart_createdAt_idx" ON "MaintenanceRequestPart"("createdAt");

-- AddForeignKey
ALTER TABLE "MaintenanceWorkNote" ADD CONSTRAINT "MaintenanceWorkNote_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWorkNote" ADD CONSTRAINT "MaintenanceWorkNote_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestPart" ADD CONSTRAINT "MaintenanceRequestPart_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestPart" ADD CONSTRAINT "MaintenanceRequestPart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
