/*
  Warnings:

  - Added the required column `cycle` to the `Program` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `programTypeIds` on the `Program` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "cycle" INTEGER NOT NULL,
ALTER COLUMN "credits" SET DATA TYPE TEXT,
DROP COLUMN "programTypeIds",
ADD COLUMN     "programTypeIds" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "ProgramType" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "programtype_id_seq";
