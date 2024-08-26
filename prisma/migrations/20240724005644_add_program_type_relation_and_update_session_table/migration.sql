/*
  Warnings:

  - You are about to drop the column `unstructuredPrerequisites` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `types` on the `Program` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Session` table. All the data in the column will be lost.
  - Added the required column `programTypeId` to the `Program` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trimester` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Trimester" AS ENUM ('A', 'E', 'H');

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "unstructuredPrerequisites";

-- AlterTable
ALTER TABLE "Program" DROP COLUMN "types",
ADD COLUMN     "programTypeId" INTEGER NOT NULL;

-- AlterTable
CREATE SEQUENCE programtype_id_seq;
ALTER TABLE "ProgramType" ALTER COLUMN "id" SET DEFAULT nextval('programtype_id_seq');
ALTER SEQUENCE programtype_id_seq OWNED BY "ProgramType"."id";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "name",
ADD COLUMN     "trimester" "Trimester" NOT NULL;

-- CreateIndex
CREATE INDEX "Program_programTypeId_idx" ON "Program"("programTypeId");

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_programTypeId_fkey" FOREIGN KEY ("programTypeId") REFERENCES "ProgramType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
