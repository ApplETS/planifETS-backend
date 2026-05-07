import { Provider } from '@nestjs/common';

import { CourseCodeValidationPipe } from '../common/pipes/models/course/course-code-validation-pipe';
import { CourseInstancesJobService } from './workers/course-instances.worker';
import { CoursesJobService } from './workers/courses.worker';
import { ProgramsJobService } from './workers/programs.worker';
import { SessionsJobService } from './workers/sessions.worker';

export const jobWorkerServiceMap = {
  ProgramsJobService,
  CoursesJobService,
  CourseInstancesJobService,
  SessionsJobService,
} as const;

export const jobWorkerProviders: Provider[] = [
  ...Object.values(jobWorkerServiceMap),
  CourseCodeValidationPipe,
];

export type JobWorkerServiceName = keyof typeof jobWorkerServiceMap;

export interface JobWorkerData {
  serviceName: JobWorkerServiceName;
  methodName: string;
}
