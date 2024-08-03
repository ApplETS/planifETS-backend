/*
  Warnings:

  - The values [A,E,H] on the enum `Trimester` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Trimester_new" AS ENUM ('AUTOMNE', 'ETE', 'HIVER');
ALTER TABLE "Session" ALTER COLUMN "trimester" TYPE "Trimester_new" USING ("trimester"::text::"Trimester_new");
ALTER TYPE "Trimester" RENAME TO "Trimester_old";
ALTER TYPE "Trimester_new" RENAME TO "Trimester";
DROP TYPE "Trimester_old";
COMMIT;
