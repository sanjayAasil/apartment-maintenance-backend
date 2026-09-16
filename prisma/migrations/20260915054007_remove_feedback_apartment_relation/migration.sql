/*
  Warnings:

  - You are about to drop the column `apartmentId` on the `Feedback` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_apartmentId_fkey";

-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN "apartmentId";
