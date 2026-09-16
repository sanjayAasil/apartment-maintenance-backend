-- CreateIndex
CREATE INDEX "MaintenanceRequest_resolvedAt_idx" ON "MaintenanceRequest"("resolvedAt");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_closedAt_idx" ON "MaintenanceRequest"("closedAt");

-- CreateIndex
CREATE INDEX "MaintenanceWorkNote_createdAt_idx" ON "MaintenanceWorkNote"("createdAt");
