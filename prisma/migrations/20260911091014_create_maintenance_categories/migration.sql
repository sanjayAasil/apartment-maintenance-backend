-- CreateTable
CREATE TABLE "MaintenanceCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceCategory_name_key" ON "MaintenanceCategory"("name");

-- Enforce business uniqueness regardless of letter casing.
CREATE UNIQUE INDEX "MaintenanceCategory_name_ci_key" ON "MaintenanceCategory"(LOWER("name"));

-- CreateIndex
CREATE INDEX "MaintenanceCategory_isActive_idx" ON "MaintenanceCategory"("isActive");
