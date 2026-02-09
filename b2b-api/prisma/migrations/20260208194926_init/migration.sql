-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "discountPercent" DECIMAL(5,2),
ADD COLUMN     "internalNotes" TEXT;
