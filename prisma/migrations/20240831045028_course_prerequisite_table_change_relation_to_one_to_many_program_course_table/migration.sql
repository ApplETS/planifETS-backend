/*
  Warnings:

  - The primary key for the `CoursePrerequisite` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `programId` to the `CoursePrerequisite` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_courseId_fkey";

-- DropForeignKey
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_prerequisiteId_fkey";

-- AlterTable
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_pkey",
ADD COLUMN     "programId" INTEGER NOT NULL,
ADD COLUMN     "unstructuredPrerequisite" TEXT,
ADD CONSTRAINT "CoursePrerequisite_pkey" PRIMARY KEY ("courseId", "programId", "prerequisiteId");

-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_courseId_programId_fkey" FOREIGN KEY ("courseId", "programId") REFERENCES "ProgramCourse"("courseId", "programId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_prerequisiteId_programId_fkey" FOREIGN KEY ("prerequisiteId", "programId") REFERENCES "ProgramCourse"("courseId", "programId") ON DELETE RESTRICT ON UPDATE CASCADE;
