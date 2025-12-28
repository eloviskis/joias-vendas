-- CreateTable
CREATE TABLE "Showcase" (
    "id" SERIAL NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT,
    "factor" DOUBLE PRECISION NOT NULL,
    "baseValue" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Showcase_pkey" PRIMARY KEY ("id")
);
