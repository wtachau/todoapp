-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultProjectId" UUID;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultProjectId_fkey" FOREIGN KEY ("defaultProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: set defaultProjectId for existing users to their earliest project
UPDATE "User" u
SET "defaultProjectId" = (
  SELECT p.id FROM "Project" p
  JOIN "TeamMember" tm ON tm."teamId" = p."teamId"
  WHERE tm."userId" = u.id
  ORDER BY p."createdAt" ASC
  LIMIT 1
)
WHERE u."defaultProjectId" IS NULL;
