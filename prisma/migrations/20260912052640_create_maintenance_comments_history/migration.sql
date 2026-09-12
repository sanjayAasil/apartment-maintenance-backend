-- CreateEnum
CREATE TYPE "MaintenanceHistoryAction" AS ENUM ('REQUEST_CREATED', 'REQUEST_UPDATED', 'STATUS_CHANGED', 'TECHNICIAN_ASSIGNED', 'TECHNICIAN_REASSIGNED', 'TECHNICIAN_UNASSIGNED', 'COMMENT_ADDED', 'CATEGORY_CHANGED', 'PRIORITY_CHANGED');

-- CreateTable
CREATE TABLE "MaintenanceComment" (
    "id" UUID NOT NULL,
    "maintenanceRequestId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceHistory" (
    "id" UUID NOT NULL,
    "maintenanceRequestId" UUID NOT NULL,
    "userId" UUID,
    "action" "MaintenanceHistoryAction" NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceComment_maintenanceRequestId_idx" ON "MaintenanceComment"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "MaintenanceComment_userId_idx" ON "MaintenanceComment"("userId");

-- CreateIndex
CREATE INDEX "MaintenanceComment_createdAt_idx" ON "MaintenanceComment"("createdAt");

-- CreateIndex
CREATE INDEX "MaintenanceHistory_maintenanceRequestId_idx" ON "MaintenanceHistory"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "MaintenanceHistory_userId_idx" ON "MaintenanceHistory"("userId");

-- CreateIndex
CREATE INDEX "MaintenanceHistory_action_idx" ON "MaintenanceHistory"("action");

-- CreateIndex
CREATE INDEX "MaintenanceHistory_createdAt_idx" ON "MaintenanceHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "MaintenanceComment" ADD CONSTRAINT "MaintenanceComment_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceComment" ADD CONSTRAINT "MaintenanceComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceHistory" ADD CONSTRAINT "MaintenanceHistory_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceHistory" ADD CONSTRAINT "MaintenanceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
