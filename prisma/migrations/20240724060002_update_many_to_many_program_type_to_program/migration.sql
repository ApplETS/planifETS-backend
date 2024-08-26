/*
  Warnings:

  - You are about to drop the column `programTypeId` on the `Program` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Program" DROP CONSTRAINT "Program_programTypeId_fkey";

-- DropIndex
DROP INDEX "Program_programTypeId_idx";

-- AlterTable
ALTER TABLE "Program" DROP COLUMN "programTypeId",
ADD COLUMN     "programTypeIds" TEXT NOT NULL DEFAULT '[]';
