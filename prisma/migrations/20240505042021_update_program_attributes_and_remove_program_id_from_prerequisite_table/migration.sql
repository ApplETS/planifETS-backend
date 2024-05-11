/*
  Warnings:

  - You are about to drop the column `programId` on the `CoursePrerequisite` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `Program` table. All the data in the column will be lost.
  - Added the required column `title` to the `Program` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Program` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `Program` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_programId_fkey";

-- AlterTable
ALTER TABLE "CoursePrerequisite" DROP COLUMN "programId";

-- AlterTable
ALTER TABLE "Program" DROP COLUMN "label",
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL,
ALTER COLUMN "abbreviation" DROP NOT NULL;
