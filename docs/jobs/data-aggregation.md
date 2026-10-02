# Data Aggregation

This page describes how the jobs pipeline aggregates academic data from the different upstream sources that we're using in this project.

## Summary

| Source | Job | What we read | What we write |
| --- | --- | --- | --- |
| ETS API | `ProgramsJobService.processPrograms` | Program list and program types | `ProgramType`, `Program` |
| ETS API | `CoursesJobService.processCourses` | Course catalog and course credits | `Course` |
| ETS website | `CoursesJobService.syncCourseDescriptionsFromEtsWebsite` | Course page description content | `Course.description` |
| Planification forecast PDFs | `CourseInstancesJobService.processCourseInstances` | Listed courses per program and availability by session | Missing `ProgramCourse` links, `Session`, `CourseInstance` |
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

### Course descriptions from website

Source job: `CoursesJobService.syncCourseDescriptionsFromEtsWebsite`

The public ETS course page is used to overwrite:

- `Course.description`

Notes:

- The website version is treated as the source of truth for course descriptions when scraping succeeds.
- Stored descriptions remain plain text, but preserve semantic formatting for UI and RAG use:
  paragraphs stay separated by blank lines and list items are stored as `- ` bullet lines.
- Unsafe HTML such as scripts is never stored in the database.

## 2. Planification forecast PDFs

Source job: `CourseInstancesJobService.processCourseInstances`

ÉTS publishes the five-session forecast at `https://horaire.etsmtl.ca/Horairepublication/Planification-${programCode}.pdf`. The existing Planification parser reads this source; no separate HorairePrevision URL is needed.

This step currently:

- parses eligible program PDFs
- creates missing `ProgramCourse` links for existing catalog courses before aggregating programs, including rows with no availability
- removes program links absent from that program's forecast only when it lists more than 20 distinct valid courses, with no invalid rows or missing catalog courses
- creates missing `Session` rows from the session codes found in the PDFs
- creates missing `CourseInstance` rows
- updates `CourseInstance.availability`
- deletes obsolete `CourseInstance` rows that are no longer present in the parsed data

Notes:

- This job is not limited to the current session. It creates sessions based on the session codes present in the planification data.
- Eligibility is controlled by `Program.isPlanificationPdfParsable`.
- Course codes are deduplicated per program; missing catalog courses are skipped with a warning.
- Retained links keep their metadata and prerequisites. Removal atomically deletes incoming/outgoing prerequisite relationships within the same program, then the absent links; other programs and catalog courses are untouched.
- Download/parse failures and forecasts with 20 or fewer distinct courses skip program-link pruning and warn, allowing the next scheduled run to try again. The parser rejects tables without recognizable session headers. Duplicate rows do not count toward the threshold, and availability is never used to decide membership.
- This count guard cannot detect an incomplete forecast that still lists more than 20 valid catalog courses; under the chosen policy, such a forecast can remove links.
- New links leave `type` and `typicalSessionIndex` unset: forecast availability is not authoritative curriculum sequencing metadata.

## 3. Horaire PDFs

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
- Both the target course and its prerequisites must have program links. A prerequisite absent from the forecast (and without an existing link) is reported and skipped; the job does not fabricate membership.
