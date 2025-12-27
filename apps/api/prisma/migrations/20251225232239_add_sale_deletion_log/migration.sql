/*
  Warnings:

  - You are about to drop the column `billingAddress` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `billingCity` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "billingAddress",
DROP COLUMN "billingCity",
ADD COLUMN     "billingaddress" TEXT;

-- CreateTable
CREATE TABLE "SaleDeletion" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "deletedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleDeletion_pkey" PRIMARY KEY ("id")
);
