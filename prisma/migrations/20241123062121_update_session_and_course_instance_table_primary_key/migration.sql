/*
  Warnings:

  - The primary key for the `CourseInstance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `CourseInstance` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `CourseInstance` table. All the data in the column will be lost.
  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Session` table. All the data in the column will be lost.
  - Added the required column `sessionTrimester` to the `CourseInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionYear` to the `CourseInstance` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CourseInstance" DROP CONSTRAINT "CourseInstance_sessionId_fkey";

-- DropIndex
DROP INDEX "CourseInstance_courseId_sessionId_idx";

-- DropIndex
DROP INDEX "CourseInstance_courseId_sessionId_key";

-- DropIndex
DROP INDEX "Session_year_trimester_key";

-- AlterTable
ALTER TABLE "CourseInstance" DROP CONSTRAINT "CourseInstance_pkey",
DROP COLUMN "id",
DROP COLUMN "sessionId",
ADD COLUMN     "sessionTrimester" "Trimester" NOT NULL,
ADD COLUMN     "sessionYear" INTEGER NOT NULL,
ADD CONSTRAINT "CourseInstance_pkey" PRIMARY KEY ("courseId", "sessionYear", "sessionTrimester");

-- AlterTable
ALTER TABLE "Session" DROP CONSTRAINT "Session_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("year", "trimester");

-- CreateIndex
CREATE INDEX "CourseInstance_courseId_sessionYear_sessionTrimester_idx" ON "CourseInstance"("courseId", "sessionYear", "sessionTrimester");

-- AddForeignKey
ALTER TABLE "CourseInstance" ADD CONSTRAINT "CourseInstance_sessionYear_sessionTrimester_fkey" FOREIGN KEY ("sessionYear", "sessionTrimester") REFERENCES "Session"("year", "trimester") ON DELETE RESTRICT ON UPDATE CASCADE;
