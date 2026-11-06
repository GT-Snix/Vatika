-- AlterTable
ALTER TABLE "Plant" ADD COLUMN     "habitat" TEXT NOT NULL,
ADD COLUMN     "partsUsed" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Plant_name_key" ON "Plant"("name");

