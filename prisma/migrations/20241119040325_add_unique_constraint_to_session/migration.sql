/*
  Warnings:

  - A unique constraint covering the columns `[year,trimester]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Session_year_trimester_key" ON "Session"("year", "trimester");
