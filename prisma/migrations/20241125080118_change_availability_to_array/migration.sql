/*
  Warnings:

  - Changed the column `availability` on the `CourseInstance` table from a scalar field to a list field. If there are non-null values in that column, this step will fail.

*/
-- Drop the existing column
ALTER TABLE "CourseInstance" DROP COLUMN "availability";

-- Add the new column as an array of enums
ALTER TABLE "CourseInstance" ADD COLUMN "availability" "Availability"[] NOT NULL DEFAULT '{}';