import { MODULE_METADATA } from '@nestjs/common/constants';
import { ScheduleModule } from '@nestjs/schedule';

import { JobsModule } from '../../src/jobs/jobs.module';
import { JobsSchedulerModule } from '../../src/jobs/jobs-scheduler.module';

describe('JobsSchedulerModule', () => {
  it('should import ScheduleModule.forRoot and JobsModule', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      JobsSchedulerModule
    );

    expect(imports).toHaveLength(2);
    expect(imports[0]).toMatchObject({ module: ScheduleModule });
    expect(imports[1]).toBe(JobsModule);
  });
});
