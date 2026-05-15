import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUrl } from 'class-validator';

export class ProgramEtsApiDto {
  @IsNumber()
  @IsPositive()
  public id!: number;

  @IsString()
  @IsNotEmpty()
  public title!: string;

  @IsString()
  @IsNotEmpty()
  public cycle!: string;

  @IsOptional()
  @IsString()
  public code!: string | null;

  @IsOptional()
  @IsString()
  public credits!: string | null;

  @IsArray()
  @IsNumber({}, { each: true })
  public types!: number[]; // Array of program type IDs

  @IsString()
  @IsUrl()
  public url!: string;
}
