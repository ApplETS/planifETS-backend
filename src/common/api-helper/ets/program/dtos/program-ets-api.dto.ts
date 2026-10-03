import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUrl,
  ValidateIf
} from 'class-validator';

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

  @ValidateIf((_object, value) => value !== null)
  @IsString()
  public code!: string | null;

  @ValidateIf((_object, value) => value !== null)
  @IsString()
  public credits!: string | null;

  @IsArray()
  @IsNumber({}, { each: true })
  public types!: number[]; // Array of program type IDs

  @IsString()
  @IsUrl()
  public url!: string;
}
