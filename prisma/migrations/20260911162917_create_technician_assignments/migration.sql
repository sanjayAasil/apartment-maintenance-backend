-- CreateTable
CREATE TABLE "MaintenanceAssignment" (
    "id" UUID NOT NULL,
    "maintenanceRequestId" UUID NOT NULL,
    "technicianId" UUID NOT NULL,
    "assignedByUserId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceAssignment_maintenanceRequestId_idx" ON "MaintenanceAssignment"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "MaintenanceAssignment_technicianId_idx" ON "MaintenanceAssignment"("technicianId");

-- CreateIndex
CREATE INDEX "MaintenanceAssignment_assignedByUserId_idx" ON "MaintenanceAssignment"("assignedByUserId");

-- CreateIndex
CREATE INDEX "MaintenanceAssignment_isActive_idx" ON "MaintenanceAssignment"("isActive");

-- CreateIndex
CREATE INDEX "MaintenanceAssignment_technicianId_isActive_idx" ON "MaintenanceAssignment"("technicianId", "isActive");

-- Enforce one active assignment per request while retaining inactive history.
CREATE UNIQUE INDEX "MaintenanceAssignment_one_active_per_request"
ON "MaintenanceAssignment"("maintenanceRequestId")
WHERE "isActive" = true;

-- AddForeignKey
ALTER TABLE "MaintenanceAssignment" ADD CONSTRAINT "MaintenanceAssignment_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAssignment" ADD CONSTRAINT "MaintenanceAssignment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAssignment" ADD CONSTRAINT "MaintenanceAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
