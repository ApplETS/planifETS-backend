import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

import { CourseEtsApiDto } from './course-ets-api.dto';

export class CourseIndexResponseDto {
  @IsArray()
  @IsString({ each: true })
  public codes!: string[]; // List of 3-letter department prefixes present in the results (ex: MAT)

  @IsArray()
  @IsString({ each: true })
  public cycles!: string[]; // List of cycle strings present in the results

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseEtsApiDto)
  public results!: CourseEtsApiDto[];
}
