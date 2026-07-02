# Fix plan: `syncCourseDescriptionsFromEtsWebsite` silent failures

## Bug

`CoursesJobService.syncCourseDescriptionsFromEtsWebsite` (`src/jobs/workers/courses.worker.ts`) fetches course descriptions from the ETS website in batches of 10 concurrent requests (`Promise.allSettled`). Each request has its own 10s timeout (`ets-course.service.ts:116`), but firing 10 requests at once causes server-side queueing on slow ETS responses, so several requests miss their own 10s window around the same time. Failures are only logged at the end of the run — nothing is retried. Out of ~1051 courses, a non-trivial number end up with a missing or stale `description`, which degrades the BGE-M3 embeddings and `CourseRetrieverService` similarity scores.

## Options considered (from the ticket)

1. Add a `User-Agent` header — **already implemented** (`ETS_USER_AGENT`, sent on every request including description fetches).
2. Raise the per-request timeout beyond 10s — **rejected**: would extend total job duration, which the user wants to avoid.
3. Add automatic retry for failed courses without redoing the whole batch — **selected**, see below.
4. Use a proxy to distribute requests and increase parallelism — **deferred**. Requires a legal review before it can be considered; not part of this fix.

## Decided approach

- Per-request timeout: unchanged (10s).
- Batch size / concurrency: unchanged (10 concurrent requests per batch).
- Add a single retry pass after the first full pass completes:
  - Run the existing batching loop once over all courses as today.
  - Collect `failedCourseCodes` as today.
  - If any courses failed, re-run the same batching logic (same batch size, same 100ms inter-batch delay) against only the courses that failed, using a code → course lookup built during the first pass.
  - Courses that succeed on retry are added to `coursesToUpdate` / `updatedCount` and removed from the failure list.
  - Courses that fail again on retry are the final `failedCourseCodes`, used for the end-of-run summary log and warning.
- Extract the "fetch a batch, partition into updates vs. failures" logic into a private helper so the initial pass and the retry pass share code instead of duplicating the loop body.
- Proxy option: left as a documented future item, no code or comment changes in this fix.

## Implementation steps

1. `src/jobs/workers/courses.worker.ts`
   - Refactor the batch-processing loop body (lines ~59–118) into a reusable private method, e.g. `processCourseBatches(courses): Promise<{ updatedCount, failedCourseCodes }>`, operating on any list of courses.
   - In `syncCourseDescriptionsFromEtsWebsite`, call this helper once for `coursesWithCodes`.
   - If the result's `failedCourseCodes` is non-empty, build the list of corresponding course objects (via a code → course map from `coursesWithCodes`) and call the helper again for just those.
   - Merge results: total `updatedCount` = first pass + retry pass; final `failedCourseCodes` = retry pass's failures only (or first pass's failures if there was no retry needed).
   - Update the final summary log and warning to use the merged/final counts.

2. `test/jobs/courses.worker.test.ts`
   - New test: a course fails on the first pass and succeeds on retry — ends up in an update batch, not in the final failed-codes warning, and `fetchCourseDescriptionFromEtsWebsite` is called twice for that code.
   - New test: a course fails on both passes — appears in the final failed-codes warning, called twice.
   - Update the existing "batches updates and logs failed course codes" test: LOG002 and LOG010 fail on the first pass, so the retry pass will issue two more calls for them. Mock those retry calls as failing again so existing assertions on the final warning stay valid, and add assertions for the extra calls / any additional `updateCourseDescriptionsBatch` call from the retry pass.

## Explicitly out of scope for this fix

- Increasing the per-request timeout.
- Reducing/increasing batch concurrency.
- Proxy usage (needs legal review first).
