import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class IdDto {
  @ApiProperty()
  @IsInt()
  public id!: number;
}
