/*
  Warnings:

  - Added the required column `x` to the `SurveyPoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `y` to the `SurveyPoint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SurveyPoint" ADD COLUMN     "x" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "y" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "coordinates" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "SurveyPoint_x_y_idx" ON "SurveyPoint"("x", "y");
