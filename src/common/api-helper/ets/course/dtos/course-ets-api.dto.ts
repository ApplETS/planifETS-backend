import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUrl,
  Length,
  ValidateIf
} from 'class-validator';

export class CourseEtsApiDto {
  @IsNumber()
  @IsPositive()
  public id!: number;

  @IsString()
  @IsNotEmpty()
  public title!: string;

  @IsString()
  public description!: string;

  @IsString()
  @IsUrl()
  public url!: string;

  @IsString()
  @Length(3, 3)
  public code3!: string; // 3-letter prefix e.g. "ATE", "LOG"

  @IsString()
  @IsNotEmpty()
  public code!: string;

  @ValidateIf((_object, value) => value !== null)
  @IsString()
  public cycle!: string | null; // "1er cycle" | "2e cycle" | "3e cycle"
}
