/*
  Warnings:

  - You are about to drop the column `unstructuredPrerequisite` on the `CoursePrerequisite` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CoursePrerequisite" DROP COLUMN "unstructuredPrerequisite";

-- AlterTable
ALTER TABLE "ProgramCourse" ADD COLUMN     "unstructuredPrerequisite" TEXT;

-- CreateIndex
CREATE INDEX "CoursePrerequisite_courseId_programId_idx" ON "CoursePrerequisite"("courseId", "programId");
