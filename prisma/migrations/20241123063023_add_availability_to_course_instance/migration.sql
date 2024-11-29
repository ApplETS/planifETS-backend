/*
  Warnings:

  - Added the required column `availability` to the `CourseInstance` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('JOUR', 'SOIR', 'INTENSIF');

-- AlterTable
ALTER TABLE "CourseInstance" ADD COLUMN     "availability" "Availability" NOT NULL;
