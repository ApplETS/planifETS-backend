import { ApiProperty } from '@nestjs/swagger';

export class SessionAvailabilityDto {
  @ApiProperty({ example: '20253' })
  public sessionCode!: string;

  @ApiProperty({ example: ['A', 'B', 'C'] })
  public availability!: string[];
}

export class PrerequisiteResult {
  @ApiProperty({ example: 349710 })
  public id!: number;

  @ApiProperty({ example: 'LOG121' })
  public code!: string;

  @ApiProperty({ example: 'Conception orientée objet' })
  public title!: string;

  @ApiProperty({ example: 3, nullable: true })
  public credits!: number | null;

  @ApiProperty({ example: 1, nullable: true })
  public cycle!: number | null;
}

export class SearchCourseResult {
  @ApiProperty({ example: 352405 })
  public id!: number;

  @ApiProperty({ example: 'LOG121', description: 'Course code. Search matches this field.' })
  public code!: string;

  @ApiProperty({ example: 'Conception orientée objet', description: 'Course title. Search matches this field.' })
  public title!: string;

  @ApiProperty({ example: 3, nullable: true })
  public credits!: number | null;

  @ApiProperty({ example: 1, nullable: true })
  public cycle!: number | null;

  @ApiProperty({ type: [SessionAvailabilityDto] })
  public sessionAvailability!: SessionAvailabilityDto[];

  @ApiProperty({ type: [PrerequisiteResult] })
  public prerequisites!: PrerequisiteResult[];

  @ApiProperty({ example: 2, nullable: true, required: false, description: 'Typical session index when this course is usually taken in the program' })
  public typicalSessionIndex?: number | null;

  @ApiProperty({
    nullable: true,
    required: false,
    enum: ['TRONC', 'CONCE', 'CONDI'],
    description: 'Course type within the program (TRONC: tronc commun, CONCE: Concentration)'
  })
  public type?: string | null;

  @ApiProperty({ type: String, nullable: true, required: false, description: 'Unstructured prerequisite text' })
  public unstructuredPrerequisite?: string | null;
}

export class SearchCoursesDto {
  @ApiProperty({ type: [SearchCourseResult] })
  public courses!: SearchCourseResult[];

  @ApiProperty({ example: 42, description: 'Total number of courses matching the search' })
  public total!: number;

  @ApiProperty({ example: true, description: 'Whether there are more results available' })
  public hasMore!: boolean;
}
