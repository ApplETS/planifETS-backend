import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class UserSessionContextDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @ApiPropertyOptional({ type: [Number], example: [182848] })
  public programIds?: number[];

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ example: 1 })
  public cycle?: number;
}

export class RetrieveCoursesDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'je veux apprendre l\'intelligence artificielle' })
  public query!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserSessionContextDto)
  @ApiPropertyOptional({ type: UserSessionContextDto })
  public context?: UserSessionContextDto;
}

export class RetrieveCoursesResponseDto {
  @ApiProperty({ type: () => [CourseResultDto] })
  public courses!: CourseResultDto[];
}

class CourseResultDto {
  @ApiProperty({ example: 'LOG635' })
  public code!: string;

  @ApiProperty({ example: 'Systèmes intelligents' })
  public title!: string;

  @ApiProperty({ example: 'Ce cours vise...' })
  public description!: string;

  @ApiProperty({ example: 0.87 })
  public score!: number;

  @ApiProperty({ type: [String], example: ['LOG121'] })
  public prerequisite_codes!: string[];
}
