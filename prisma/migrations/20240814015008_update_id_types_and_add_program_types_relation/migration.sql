/*
  Warnings:

  - The primary key for the `Course` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `programId` on the `Course` table. All the data in the column will be lost.
  - The primary key for the `CoursePrerequisite` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Program` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `programTypeIds` on the `Program` table. All the data in the column will be lost.
  - The primary key for the `ProgramCourse` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `Course` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseId` on the `CourseInstance` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseId` on the `CoursePrerequisite` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `prerequisiteId` on the `CoursePrerequisite` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Program` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `typicalSessionIndex` to the `ProgramCourse` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `courseId` on the `ProgramCourse` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `programId` on the `ProgramCourse` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "CourseInstance" DROP CONSTRAINT "CourseInstance_courseId_fkey";

-- DropForeignKey
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_courseId_fkey";

-- DropForeignKey
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_prerequisiteId_fkey";

-- DropForeignKey
ALTER TABLE "ProgramCourse" DROP CONSTRAINT "ProgramCourse_courseId_fkey";

-- DropForeignKey
ALTER TABLE "ProgramCourse" DROP CONSTRAINT "ProgramCourse_programId_fkey";

-- DropIndex
DROP INDEX "Course_code_programId_idx";

-- AlterTable
ALTER TABLE "Course" DROP CONSTRAINT "Course_pkey",
DROP COLUMN "programId",
DROP COLUMN "id",
ADD COLUMN     "id" INTEGER NOT NULL,
ADD CONSTRAINT "Course_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CourseInstance" DROP COLUMN "courseId",
ADD COLUMN     "courseId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_pkey",
DROP COLUMN "courseId",
ADD COLUMN     "courseId" INTEGER NOT NULL,
DROP COLUMN "prerequisiteId",
ADD COLUMN     "prerequisiteId" INTEGER NOT NULL,
ADD CONSTRAINT "CoursePrerequisite_pkey" PRIMARY KEY ("courseId", "prerequisiteId");

-- AlterTable
ALTER TABLE "Program" DROP CONSTRAINT "Program_pkey",
DROP COLUMN "programTypeIds",
DROP COLUMN "id",
ADD COLUMN     "id" INTEGER NOT NULL,
ADD CONSTRAINT "Program_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ProgramCourse" DROP CONSTRAINT "ProgramCourse_pkey",
ADD COLUMN     "typicalSessionIndex" INTEGER NOT NULL,
DROP COLUMN "courseId",
ADD COLUMN     "courseId" INTEGER NOT NULL,
DROP COLUMN "programId",
ADD COLUMN     "programId" INTEGER NOT NULL,
ADD CONSTRAINT "ProgramCourse_pkey" PRIMARY KEY ("courseId", "programId");

-- CreateTable
CREATE TABLE "_ProgramToProgramType" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProgramToProgramType_AB_unique" ON "_ProgramToProgramType"("A", "B");

-- CreateIndex
CREATE INDEX "_ProgramToProgramType_B_index" ON "_ProgramToProgramType"("B");

-- CreateIndex
CREATE INDEX "Course_code_idx" ON "Course"("code");

-- CreateIndex
CREATE INDEX "CourseInstance_courseId_sessionId_idx" ON "CourseInstance"("courseId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseInstance_courseId_sessionId_key" ON "CourseInstance"("courseId", "sessionId");

-- AddForeignKey
ALTER TABLE "CourseInstance" ADD CONSTRAINT "CourseInstance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCourse" ADD CONSTRAINT "ProgramCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCourse" ADD CONSTRAINT "ProgramCourse_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProgramToProgramType" ADD CONSTRAINT "_ProgramToProgramType_A_fkey" FOREIGN KEY ("A") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProgramToProgramType" ADD CONSTRAINT "_ProgramToProgramType_B_fkey" FOREIGN KEY ("B") REFERENCES "ProgramType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
