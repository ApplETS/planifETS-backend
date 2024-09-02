-- AlterTable
ALTER TABLE "ProgramCourse" ADD COLUMN     "type" TEXT,
ALTER COLUMN "typicalSessionIndex" DROP NOT NULL;
