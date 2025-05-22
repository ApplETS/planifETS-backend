import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class IdDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  public id?: number;
}
