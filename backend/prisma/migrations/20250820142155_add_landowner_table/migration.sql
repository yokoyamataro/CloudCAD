/*
  Warnings:

  - You are about to drop the column `coordinates` on the `SurveyPoint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LandParcel" ADD COLUMN     "landOwnerId" TEXT,
ALTER COLUMN "registrationDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "SurveyPoint" DROP COLUMN "coordinates",
ALTER COLUMN "measureDate" SET DATA TYPE DATE;

-- CreateTable
CREATE TABLE "Landowner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "birthDate" DATE,
    "idNumber" TEXT,
    "remarks" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Landowner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Landowner_projectId_name_key" ON "Landowner"("projectId", "name");

-- AddForeignKey
ALTER TABLE "Landowner" ADD CONSTRAINT "Landowner_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandParcel" ADD CONSTRAINT "LandParcel_landOwnerId_fkey" FOREIGN KEY ("landOwnerId") REFERENCES "Landowner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
