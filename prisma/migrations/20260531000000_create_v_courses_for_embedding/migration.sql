-- CreateView: v_courses_for_embedding
-- One row per (course, program) pair — source of truth for the embedding indexing job.

CREATE VIEW "v_courses_for_embedding" AS
WITH
  -- Distinct sessions (formatted as "Automne 2024") and availability modes per course.
  -- CourseInstance.availability is an array column, so we unnest before aggregating.
  course_sessions AS (
    SELECT
      ci."courseId",
      array_remove(
        array_agg(DISTINCT
          CONCAT(
            CASE ci."sessionTrimester"
              WHEN 'AUTOMNE' THEN 'Automne'
              WHEN 'ETE'     THEN 'Été'
              WHEN 'HIVER'   THEN 'Hiver'
            END,
            ' ',
            ci."sessionYear"
          )
        ),
        NULL
      )                                                                     AS sessions,
      array_remove(array_agg(DISTINCT avail::TEXT), NULL)                   AS availability
    FROM "CourseInstance" ci
    LEFT JOIN LATERAL unnest(ci.availability) AS avail ON TRUE
    GROUP BY ci."courseId"
  ),

  -- Structured prerequisite codes per (courseId, programId), deduped across rows.
  course_prereqs AS (
    SELECT
      pr."courseId",
      pr."programId",
      array_remove(array_agg(DISTINCT prereq_c.code), NULL) AS prerequisite_codes
    FROM "Prerequisite" pr
    JOIN "Course" prereq_c ON prereq_c.id = pr."prerequisiteId"
    GROUP BY pr."courseId", pr."programId"
  )

-- One row per (course, program) pair.
-- Scalars come from Course / ProgramCourse / Program.
-- Array columns (prerequisite_codes, availability, sessions) are pre-aggregated by the CTEs above.
-- unstructured_prerequisite is nulled out when its value is exactly two structured course codes
-- (e.g. "LOG121, MAT350"), since those are already captured in prerequisite_codes.
SELECT
  CONCAT(c.id, '_', p.id)                            AS embedding_id,
  c.id                                               AS course_id,
  p.id                                               AS program_id,
  c.code,
  c.title,
  c.description,
  c.cycle,
  p.title                                            AS program_title,
  pc.type,
  pc."typicalSessionIndex"                           AS typical_session_index,
  CASE
    WHEN pc."unstructuredPrerequisite" ~ '^[A-Z]{3}\d{3}, [A-Z]{3}\d{3}$'
    THEN NULL
    ELSE pc."unstructuredPrerequisite"
  END                                                AS unstructured_prerequisite,
  COALESCE(cpr.prerequisite_codes, ARRAY[]::TEXT[])  AS prerequisite_codes,
  COALESCE(array_length(cpr.prerequisite_codes, 1), 0) > 0 AS has_prerequisites,
  COALESCE(cs.availability,        ARRAY[]::TEXT[])  AS availability,
  COALESCE(cs.sessions,            ARRAY[]::TEXT[])  AS sessions
FROM "Course" c
INNER JOIN "ProgramCourse" pc  ON pc."courseId"  = c.id
INNER JOIN "Program" p         ON p.id           = pc."programId"
LEFT JOIN  course_prereqs  cpr ON cpr."courseId"  = c.id AND cpr."programId" = p.id
LEFT JOIN  course_sessions cs  ON cs."courseId"   = c.id;
