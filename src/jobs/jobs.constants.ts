import { Provider } from '@nestjs/common';

import { CourseCodeValidationPipe } from '../common/pipes/models/course/course-code-validation-pipe';
import { CourseEmbeddingIndexerService } from '../embedding/embedding-course-indexer.service';
import { CourseInstancesJobService } from './workers/course-instances.worker';
import { CoursesJobService } from './workers/courses.worker';
import { ProgramsJobService } from './workers/programs.worker';
import { SessionsJobService } from './workers/sessions.worker';

export const jobWorkerServiceMap = {
  ProgramsJobService,
  CoursesJobService,
  CourseInstancesJobService,
  SessionsJobService,
  CourseEmbeddingIndexerService,
} as const;

export const jobWorkerProviders: Provider[] = [
  ProgramsJobService,
  CoursesJobService,
  CourseInstancesJobService,
  SessionsJobService,
  CourseCodeValidationPipe,
];

export type JobWorkerServiceName = keyof typeof jobWorkerServiceMap;

export interface JobWorkerData {
  serviceName: JobWorkerServiceName;
  methodName: string;
}
