import { Provider } from '@nestjs/common';

import { CourseCodeValidationPipe } from '../../src/common/pipes/models/course/course-code-validation-pipe';
import { CourseEmbeddingIndexerService } from '../../src/embedding/embedding-course-indexer.service';
import {
  jobWorkerProviders,
  jobWorkerServiceMap
} from '../../src/jobs/jobs.constants';
import { CourseInstancesJobService } from '../../src/jobs/workers/course-instances.worker';
import { CoursesJobService } from '../../src/jobs/workers/courses.worker';
import { ProgramsJobService } from '../../src/jobs/workers/programs.worker';
import { SessionsJobService } from '../../src/jobs/workers/sessions.worker';

describe('jobs.constants', () => {
  it('should expose all worker services in the worker service map', () => {
    expect(jobWorkerServiceMap).toEqual({
      ProgramsJobService,
      CoursesJobService,
      CourseInstancesJobService,
      SessionsJobService,
      CourseEmbeddingIndexerService
    });
  });

  it('should expose the expected worker service names', () => {
    expect(Object.keys(jobWorkerServiceMap)).toEqual([
      'ProgramsJobService',
      'CoursesJobService',
      'CourseInstancesJobService',
      'SessionsJobService',
      'CourseEmbeddingIndexerService'
    ]);
  });

  it('should register worker providers required by the worker module', () => {
    expect(jobWorkerProviders).toEqual(
      expect.arrayContaining<Provider>([
        ProgramsJobService,
        CoursesJobService,
        CourseInstancesJobService,
        SessionsJobService,
        CourseCodeValidationPipe
      ])
    );
  });

  it('should not directly register CourseEmbeddingIndexerService in jobWorkerProviders', () => {
    expect(jobWorkerProviders).not.toContain(CourseEmbeddingIndexerService);
  });
});
