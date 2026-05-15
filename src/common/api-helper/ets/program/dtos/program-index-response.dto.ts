import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { ProgramEtsApiDto } from './program-ets-api.dto';
import { ProgramTypeEtsApiDto } from './program-type-ets-api.dto';

export class ProgramIndexResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramTypeEtsApiDto)
  public types!: ProgramTypeEtsApiDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramEtsApiDto)
  public results!: ProgramEtsApiDto[];
}
