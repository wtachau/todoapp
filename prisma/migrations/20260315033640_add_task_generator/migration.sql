-- CreateEnum
CREATE TYPE "AssignmentMode" AS ENUM ('fixed', 'round_robin');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "generatorId" UUID;

-- CreateTable
CREATE TABLE "TaskGenerator" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "assignmentMode" "AssignmentMode" NOT NULL,
    "fixedAssigneeId" UUID,
    "lastAssignedTo" UUID,
    "recurrenceRule" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskGenerator_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_generatorId_fkey" FOREIGN KEY ("generatorId") REFERENCES "TaskGenerator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGenerator" ADD CONSTRAINT "TaskGenerator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGenerator" ADD CONSTRAINT "TaskGenerator_fixedAssigneeId_fkey" FOREIGN KEY ("fixedAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGenerator" ADD CONSTRAINT "TaskGenerator_lastAssignedTo_fkey" FOREIGN KEY ("lastAssignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
