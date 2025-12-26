import { ApiProperty } from '@nestjs/swagger';

export class RunWorkersDto {
  @ApiProperty({ default: true })
  public processAllJobs: boolean = true;

  @ApiProperty({ default: false })
  public processPrograms: boolean = false;

  @ApiProperty({ default: false })
  public processCourses: boolean = false;

  @ApiProperty({ default: false })
  public processCourseInstances: boolean = false;

  @ApiProperty({ default: false })
  public processProgramCourses: boolean = false;

  @ApiProperty({ default: false })
  public processSessions: boolean = false;
}
