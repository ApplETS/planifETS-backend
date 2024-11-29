/*
  Warnings:

  - You are about to drop the column `pdfParsable` on the `Program` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Program" DROP COLUMN "pdfParsable",
ADD COLUMN     "isHorairePdfParsable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPlanificationPdfParsable" BOOLEAN NOT NULL DEFAULT false;
