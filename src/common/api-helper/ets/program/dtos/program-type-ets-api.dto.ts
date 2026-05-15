import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class ProgramTypeEtsApiDto {
  @IsNumber()
  @IsPositive()
  public id!: number;

  @IsString()
  @IsNotEmpty()
  public title!: string;
}
