/*
  Warnings:

  - You are about to drop the column `abbreviation` on the `Program` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Program` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code,title]` on the table `Program` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Program" DROP COLUMN "abbreviation",
DROP COLUMN "type",
ADD COLUMN     "types" INTEGER[];

-- CreateTable
CREATE TABLE "ProgramType" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "ProgramType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Program_code_title_key" ON "Program"("code", "title");
