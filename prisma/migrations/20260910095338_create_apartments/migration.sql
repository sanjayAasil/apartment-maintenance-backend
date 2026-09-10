-- CreateTable
CREATE TABLE "Apartment" (
    "id" UUID NOT NULL,
    "block" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Apartment_block_idx" ON "Apartment"("block");

-- CreateIndex
CREATE INDEX "Apartment_floor_idx" ON "Apartment"("floor");

-- CreateIndex
CREATE UNIQUE INDEX "Apartment_block_unitNumber_key" ON "Apartment"("block", "unitNumber");
