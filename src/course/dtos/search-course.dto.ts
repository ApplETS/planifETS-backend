import { ApiProperty } from '@nestjs/swagger';

export class SessionAvailabilityDto {
  @ApiProperty({ example: '20253' })
  sessionCode!: string;

  @ApiProperty({ example: ['A', 'B', 'C'] })
  availability!: string[];
}

export class PrerequisiteResult {
  @ApiProperty({ example: 349710 })
  id!: number;

  @ApiProperty({ example: 'LOG121' })
  code!: string;

  @ApiProperty({ example: 'Conception orientée objet' })
  title!: string;

  @ApiProperty({ example: 3, nullable: true })
  credits!: number | null;

  @ApiProperty({ example: 1, nullable: true })
  cycle!: number | null;
}

export class SearchCourseResult {
  @ApiProperty({ example: 352405 })
  id!: number;

  @ApiProperty({ example: 'LOG121' })
  code!: string;

  @ApiProperty({ example: 'Conception orientée objet' })
  title!: string;

  @ApiProperty({ example: 3, nullable: true })
  credits!: number | null;

  @ApiProperty({ example: 1, nullable: true })
  cycle!: number | null;

  @ApiProperty({ type: [SessionAvailabilityDto] })
  sessionAvailability!: SessionAvailabilityDto[];

  @ApiProperty({ example: 2, nullable: true, required: false })
  typicalIndex?: number | null;

  @ApiProperty({ type: [PrerequisiteResult], required: false })
  prerequisites?: PrerequisiteResult[];
}

export class SearchCoursesDto {
  @ApiProperty({ type: [SearchCourseResult] })
  courses!: SearchCourseResult[];

  @ApiProperty({ example: 42, description: 'Total number of courses matching the search' })
  total!: number;

  @ApiProperty({ example: true, description: 'Whether there are more results available' })
  hasMore!: boolean;
}
