import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  ValidateIf
} from 'class-validator';

export class CourseByIdEtsApiDto {
  @IsNumber()
  @IsPositive()
  public id!: number;

  @IsString()
  @IsNotEmpty()
  public title!: string;

  @IsString()
  @IsNotEmpty()
  public code!: string;

  @ValidateIf((_object, value) => value !== null)
  @IsNumber()
  public credits!: number | null;
}
