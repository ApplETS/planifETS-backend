import { ApiProperty } from '@nestjs/swagger';

export class DistributionDto {
  @ApiProperty({ example: 12, description: 'Minimum value' })
  public min!: number;

  @ApiProperty({ example: 4821, description: 'Maximum value' })
  public max!: number;

  @ApiProperty({ example: 612.4, description: 'Arithmetic mean' })
  public mean!: number;

  @ApiProperty({ example: 524, description: '50th percentile (linear interpolation)' })
  public median!: number;

  @ApiProperty({ example: 1180, description: '90th percentile' })
  public p90!: number;

  @ApiProperty({ example: 1540, description: '95th percentile' })
  public p95!: number;

  @ApiProperty({ example: 2310, description: '99th percentile' })
  public p99!: number;
}

export class PrerequisiteStatsDto {
  @ApiProperty({ example: 840, description: 'Courses with ≥1 structured prerequisite (deduplicated across programs)' })
  public coursesWithPrerequisites!: number;

  @ApiProperty({ example: 120, description: 'Courses with at least one unstructured (free-text) prerequisite' })
  public coursesWithUnstructuredPrerequisite!: number;

  @ApiProperty({ example: 2100, description: 'Total prerequisite edges across all courses and programs' })
  public totalEdges!: number;

  @ApiProperty({ type: DistributionDto, description: 'Distribution of unique prerequisite count per course (only courses with ≥1 prereq)' })
  public prerequisitesPerCourse!: DistributionDto;
}

export class ProgramStatsDto {
  @ApiProperty({ example: 1650, description: 'Courses linked to at least one program' })
  public coursesWithPrograms!: number;

  @ApiProperty({ example: 84, description: 'Courses with no program association' })
  public coursesWithoutPrograms!: number;

  @ApiProperty({ example: 3800, description: 'Total program–course links across all courses' })
  public totalLinks!: number;

  @ApiProperty({ type: DistributionDto, description: 'Distribution of program count per course (only courses with ≥1 program)' })
  public programsPerCourse!: DistributionDto;
}

export class TrimesterBreakdownDto {
  @ApiProperty({ example: 800, description: 'Total instances offered in autumn' })
  public AUTOMNE!: number;

  @ApiProperty({ example: 700, description: 'Total instances offered in winter' })
  public HIVER!: number;

  @ApiProperty({ example: 350, description: 'Total instances offered in summer' })
  public ETE!: number;
}

export class AvailabilityBreakdownDto {
  @ApiProperty({ example: 1500, description: 'Total availability slots of type JOUR' })
  public JOUR!: number;

  @ApiProperty({ example: 300, description: 'Total availability slots of type SOIR' })
  public SOIR!: number;

  @ApiProperty({ example: 50, description: 'Total availability slots of type INTENSIF' })
  public INTENSIF!: number;
}

export class InstanceStatsDto {
  @ApiProperty({ example: 1200, description: 'Courses offered in at least one session' })
  public coursesWithInstances!: number;

  @ApiProperty({ example: 4500, description: 'Total course-instance records across all courses and sessions' })
  public totalInstances!: number;

  @ApiProperty({ type: DistributionDto, description: 'Distribution of session-instance count per course (only courses with ≥1 instance)' })
  public instancesPerCourse!: DistributionDto;

  @ApiProperty({ type: TrimesterBreakdownDto, description: 'Total instances per trimester across all courses' })
  public byTrimester!: TrimesterBreakdownDto;

  @ApiProperty({ type: AvailabilityBreakdownDto, description: 'Total availability slots across all instances' })
  public byAvailability!: AvailabilityBreakdownDto;
}

export class TokenStatsDto {
  @ApiProperty({ example: 1746, description: 'Total courses in the database' })
  public total!: number;

  @ApiProperty({ example: 1734, description: 'Courses with a non-empty description' })
  public count!: number;

  @ApiProperty({ example: 12, description: 'Courses with an empty description' })
  public emptyCount!: number;

  @ApiProperty({ type: DistributionDto, description: 'Character-count statistics' })
  public characters!: DistributionDto;

  @ApiProperty({
    type: DistributionDto,
    description: 'Token-count estimates derived from ceil(characters / charsPerToken)',
  })
  public estimatedTokens!: DistributionDto;

  @ApiProperty({
    example: 4,
    description: 'Characters-per-token ratio used for the token estimate (~4 chars per token for FR/EN text)',
  })
  public charsPerToken!: number;

  @ApiProperty({ type: PrerequisiteStatsDto, description: 'Prerequisite coverage and distribution across programs' })
  public prerequisites!: PrerequisiteStatsDto;

  @ApiProperty({ type: ProgramStatsDto, description: 'Program association coverage and distribution' })
  public programs!: ProgramStatsDto;

  @ApiProperty({ type: InstanceStatsDto, description: 'Course-instance (offering) coverage, trimester breakdown, and availability breakdown' })
  public instances!: InstanceStatsDto;
}
