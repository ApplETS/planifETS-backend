-- Insert 3 generic Stage placeholder courses
INSERT INTO "Course" (id, code, title, description, credits, cycle, "createdAt", "updatedAt")
VALUES
  (9000001, 'STG001', 'Stage I',   'Stage 1 générique', 9, 1, NOW(), NOW()),
  (9000002, 'STG002', 'Stage II',  'Stage 2 générique', 9, 1, NOW(), NOW()),
  (9000003, 'STG003', 'Stage III', 'Stage 3 générique', 9, 1, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Link to all cycle-1 programs that already have ≥1 ProgramCourse
INSERT INTO "ProgramCourse" ("courseId", "programId", "type", "createdAt", "updatedAt")
SELECT c.id, p.id, 'STAGE', NOW(), NOW()
FROM "Course" c
CROSS JOIN (
  SELECT DISTINCT p.id FROM "Program" p
  WHERE p.cycle = 1
  AND EXISTS (SELECT 1 FROM "ProgramCourse" pc WHERE pc."programId" = p.id)
) p
WHERE c.code IN ('STG001', 'STG002', 'STG003')
ON CONFLICT ("courseId", "programId") DO NOTHING;
