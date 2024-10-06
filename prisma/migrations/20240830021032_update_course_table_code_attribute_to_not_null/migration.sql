/*
  Warnings:

  - Made the column `code` on table `Course` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "code" SET NOT NULL;
