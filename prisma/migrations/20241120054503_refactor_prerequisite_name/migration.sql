/*
  Warnings:

  - You are about to drop the `CoursePrerequisite` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_courseId_programId_fkey";

-- DropForeignKey
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_prerequisiteId_programId_fkey";

-- DropTable
DROP TABLE "CoursePrerequisite";

-- CreateTable
CREATE TABLE "Prerequisite" (
    "courseId" INTEGER NOT NULL,
    "prerequisiteId" INTEGER NOT NULL,
    "programId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prerequisite_pkey" PRIMARY KEY ("courseId","programId","prerequisiteId")
);

-- CreateIndex
CREATE INDEX "Prerequisite_courseId_programId_idx" ON "Prerequisite"("courseId", "programId");

-- AddForeignKey
ALTER TABLE "Prerequisite" ADD CONSTRAINT "Prerequisite_courseId_programId_fkey" FOREIGN KEY ("courseId", "programId") REFERENCES "ProgramCourse"("courseId", "programId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prerequisite" ADD CONSTRAINT "Prerequisite_prerequisiteId_programId_fkey" FOREIGN KEY ("prerequisiteId", "programId") REFERENCES "ProgramCourse"("courseId", "programId") ON DELETE RESTRICT ON UPDATE CASCADE;
