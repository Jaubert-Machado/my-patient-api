-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "patient_cases" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "evaluation" JSONB,
ADD COLUMN     "labMessages" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "patientMessages" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "physicalMessages" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "status" "CaseStatus" NOT NULL DEFAULT 'IN_PROGRESS';
