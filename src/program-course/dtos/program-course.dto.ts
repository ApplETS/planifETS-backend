import { ApiProperty } from '@nestjs/swagger';
import { ProgramCourse } from '@prisma/client';

export class SessionAvailabilityDto {
  @ApiProperty()
  public sessionCode!: string;

  @ApiProperty({
    type: [String],
    enum: ['JOUR', 'SOIR', 'INTENSIF'],
    isArray: true,
  })
  public availability!: string[];
}

export class CoursePrerequisiteDto {
  @ApiProperty()
  public id!: number;

  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public title!: string;

  @ApiProperty({ nullable: true })
  public credits!: number | null;

  @ApiProperty({ nullable: true })
  public cycle!: number | null;
}

export class ProgramCourseDto {
  @ApiProperty()
  public id!: number;

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

  @ApiProperty({
    nullable: true,
    enum: ['TRONC', 'CONCE', 'CONDI', 'PROFI'],
    description: 'Course type within the program (TRONC: tron commun, CONCE: Concentration)',
  })
  public type!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Typical session index when this course is usually taken in the program',
  })
  public typicalSessionIndex!: number | null;

  @ApiProperty({ type: String, nullable: true })
  public unstructuredPrerequisite!: string | null;

  @ApiProperty({ type: Number, nullable: true, description: 'Current cycle level of the course' })
  public cycle!: number | null;
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

  @ApiProperty({ type: () => DetailedProgramCourseCourseInstanceSessionDto })
  public session!: DetailedProgramCourseCourseInstanceSessionDto;
}

export class DetailedProgramCoursePrerequisiteCourseDto {
  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public title!: string;
}

export class DetailedProgramCoursePrerequisiteDto {
  @ApiProperty({ type: () => DetailedProgramCoursePrerequisiteCourseDto })
  public course!: DetailedProgramCoursePrerequisiteCourseDto;
}

export class DetailedProgramCourseCourseDto {
  @ApiProperty()
  public code!: string;

  @ApiProperty()
  public title!: string;

  @ApiProperty({ type: Number, nullable: true })
  public credits!: number | null;

  @ApiProperty()
  public description!: string;

  @ApiProperty({ type: Number, nullable: true })
  public cycle!: number | null;

  @ApiProperty({ type: () => [DetailedProgramCourseCourseInstanceDto] })
  public courseInstances!: DetailedProgramCourseCourseInstanceDto[];
}

export class DetailedProgramCoursePrerequisiteWrapperDto {
  @ApiProperty({ type: () => DetailedProgramCoursePrerequisiteDto })
  public prerequisite!: DetailedProgramCoursePrerequisiteDto;
}

export class DetailedProgramCourseDto {
  @ApiProperty()
  public courseId!: number;

  @ApiProperty()
  public programId!: number;

  @ApiProperty({ type: String, nullable: true })
  public type!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  public typicalSessionIndex!: number | null;

  @ApiProperty({ type: String, nullable: true })
  public unstructuredPrerequisite!: string | null;

  @ApiProperty({ type: () => DetailedProgramCourseCourseDto })
  public course!: DetailedProgramCourseCourseDto;

  @ApiProperty({ type: () => [DetailedProgramCoursePrerequisiteWrapperDto] })
  public prerequisites!: DetailedProgramCoursePrerequisiteWrapperDto[];
}

export class ProgramCoursePrismaDto implements ProgramCourse {
  @ApiProperty()
  public courseId!: number;

  @ApiProperty()
  public programId!: number;

  @ApiProperty({ type: String, nullable: true })
  public type!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  public typicalSessionIndex!: number | null;

  @ApiProperty({ type: String, nullable: true })
  public unstructuredPrerequisite!: string | null;

  @ApiProperty()
  public createdAt!: Date;

  @ApiProperty()
  public updatedAt!: Date;
}

export class ProgramCoursesErrorDto {
  @ApiProperty({ type: [String], description: 'List of invalid program codes' })
  public invalidProgramCodes!: string[];
}

export class ProgramCoursesResponseDto {
  @ApiProperty({ type: () => [ProgramCoursesDto], description: 'Array of program courses grouped by program code' })
  public data!: ProgramCoursesDto[];

  @ApiProperty({ type: () => ProgramCoursesErrorDto, required: false, description: 'Error information if any program codes were invalid' })
  public errors?: ProgramCoursesErrorDto;
}
