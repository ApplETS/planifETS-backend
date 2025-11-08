import { ApiProperty } from '@nestjs/swagger';
import { ProgramCourse } from '@prisma/client';

export class SessionAvailabilityDto {
  @ApiProperty()
  public sessionCode!: string;

  @ApiProperty({ type: [String] })
  public availability!: string[];
}

export class CoursePrerequisiteDto {
  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public title!: string;
}

export class ProgramCourseDto {
  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public title!: string;

  @ApiProperty()
  public credits!: number;

  @ApiProperty({ type: () => [SessionAvailabilityDto] })
  public sessionAvailability!: SessionAvailabilityDto[];

  @ApiProperty({ type: () => [CoursePrerequisiteDto] })
  public prerequisites!: CoursePrerequisiteDto[];

  @ApiProperty({ nullable: true })
  public type!: string | null;

  @ApiProperty({ nullable: true })
  public typicalSessionIndex!: number | null;

  @ApiProperty({ nullable: true })
  public unstructuredPrerequisite!: string | null;
}

export class ProgramCoursesDto {
  @ApiProperty()
  public programCode!: string;

  @ApiProperty()
  public programTitle!: string;

  @ApiProperty({ type: () => [ProgramCourseDto] })
  public courses!: ProgramCourseDto[];
}

export class DetailedProgramCourseCourseInstanceSessionDto {
  @ApiProperty()
  public trimester!: string;

  @ApiProperty()
  public year!: number;
}

export class DetailedProgramCourseCourseInstanceDto {
  @ApiProperty({ type: [String] })
  public availability!: string[];

  @ApiProperty()
  public sessionYear!: number;

  @ApiProperty()
  public sessionTrimester!: string;

  @ApiProperty({ type: DetailedProgramCourseCourseInstanceSessionDto })
  public session!: DetailedProgramCourseCourseInstanceSessionDto;
}

export class DetailedProgramCoursePrerequisiteCourseDto {
  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public title!: string;
}

export class DetailedProgramCoursePrerequisiteDto {
  @ApiProperty({ type: DetailedProgramCoursePrerequisiteCourseDto })
  public course!: DetailedProgramCoursePrerequisiteCourseDto;
}

export class DetailedProgramCourseDto {
  @ApiProperty()
  public courseId!: number;

  @ApiProperty()
  public programId!: number;

  @ApiProperty({ nullable: true })
  public type!: string | null;

  @ApiProperty({ nullable: true })
  public typicalSessionIndex!: number | null;

  @ApiProperty({ nullable: true })
  public unstructuredPrerequisite!: string | null;

  @ApiProperty({
    type: () => Object,
  })
  public course!: {
    code: string;
    title: string;
    credits: number | null;
    description: string;
    cycle: number | null;
    courseInstances: DetailedProgramCourseCourseInstanceDto[];
  };

  @ApiProperty({ type: [Object] })
  public prerequisites!: {
    prerequisite: {
      course:
      {
        code: string;
        title: string
      }
    };
  }[];
}

export class ProgramCoursePrismaDto implements ProgramCourse {
  @ApiProperty()
  public courseId!: number;

  @ApiProperty()
  public programId!: number;

  @ApiProperty({ nullable: true })
  public type!: string | null;

  @ApiProperty({ nullable: true })
  public typicalSessionIndex!: number | null;

  @ApiProperty({ nullable: true })
  public unstructuredPrerequisite!: string | null;

  @ApiProperty()
  public createdAt!: Date;

  @ApiProperty()
  public updatedAt!: Date;
}
