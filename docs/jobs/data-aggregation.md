# Data Aggregation

This page describes how the jobs pipeline aggregates academic data from the different upstream sources that we're using in this project.

## Summary

| Source | Job | What we read | What we write |
| --- | --- | --- | --- |
| ETS API | `ProgramsJobService.processPrograms` | Program list and program types | `ProgramType`, `Program` |
| ETS API | `CoursesJobService.processCourses` | Course catalog and course credits | `Course` |
| Cheminot | `CoursesJobService.syncCourseDetailsWithCheminotData` | Program-course sequencing metadata | `ProgramCourse.typicalSessionIndex`, `ProgramCourse.type`, missing `ProgramCourse` links |
| Planification PDFs | `CourseInstancesJobService.processCourseInstances` | Course availability by session | `Session`, `CourseInstance` |
| Horaire PDFs | `SessionsJobService.processSessions` | Current-session prerequisite text and course prerequisite relationships | `ProgramCourse.unstructuredPrerequisite`, `ProgramCoursePrerequisite` |

## 1. ETS API

### Programs

Source job: `ProgramsJobService.processPrograms`

The ETS programs endpoint is used to upsert:

- `Program.id`
- `Program.code`
- `Program.title`
- `Program.credits`
- `Program.url`
- `Program.cycle`
- `ProgramType`
- `Program.programTypes`

Notes:

- Program types are created first, then programs are upserted with relations to those types.
- This step does not create program-course sequencing data.

### Courses

Source job: `CoursesJobService.processCourses`

The ETS courses endpoints are used to upsert:

- `Course.id`
- `Course.code`
- `Course.title`
- `Course.description`
- `Course.credits`
- `Course.cycle`

Notes:

- The implementation first fetches the catalog, then fetches credits in batches by course ID.
- This step does not assign courses to programs.

## 2. Cheminot

Source job: `CoursesJobService.syncCourseDetailsWithCheminotData`

Cheminot is used to enrich the relationship between programs and courses.

It currently drives:

- creation of missing `ProgramCourse` rows
- `ProgramCourse.typicalSessionIndex`
- `ProgramCourse.type`

Notes:

- The Cheminot file format can express prerequisites, but the current job does not use it as the source of truth for prerequisite synchronization.
- Structured prerequisites are synchronized later from Horaire PDFs.

Related reference:

- [Cheminot note](./Cheminot/note.md)

## 3. Planification PDFs

Source job: `CourseInstancesJobService.processCourseInstances`

Planification PDFs are used to derive course availability across sessions.

This step currently:

- parses eligible program PDFs
- creates missing `Session` rows from the session codes found in the PDFs
- creates missing `CourseInstance` rows
- updates `CourseInstance.availability`
- deletes obsolete `CourseInstance` rows that are no longer present in the parsed data

Notes:

- This job is not limited to the current session. It creates sessions based on the session codes present in the planification data.
- Eligibility is controlled by `Program.isPlanificationPdfParsable`.

## 4. Horaire PDFs

Source job: `SessionsJobService.processSessions`

Horaire PDFs are used for prerequisite synchronization for the current session.

This step currently:

- determines the current session from the current date
- parses eligible Horaire PDFs for that session
- updates `ProgramCourse.unstructuredPrerequisite`
- creates missing `ProgramCoursePrerequisite` rows
- deletes stale `ProgramCoursePrerequisite` rows

Notes:

- Eligibility is controlled by `Program.isHorairePdfParsable`.
- This is the current source of truth for structured prerequisite relationships in the jobs pipeline.
