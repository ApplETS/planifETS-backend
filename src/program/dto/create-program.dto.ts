// src/program/dtos/create-program.dto.ts
import { IsInt, IsJSON, IsOptional, IsString, IsUrl } from 'class-validator';
import { HoraireCours } from 'src/pdf/pdf-parser/horaire/HoraireCours';
import { PlanificationCours } from 'src/pdf/pdf-parser/planification/planification-cours.types';

export class CreateProgramDto {
  @IsInt()
  public code!: number;

  @IsString()
  public title!: string;

  @IsInt()
  public credits!: number;

  @IsString()
  public type!: string;

  @IsOptional()
  @IsUrl()
  public url?: string;

  @IsOptional()
  @IsJSON()
  public horaireCoursPdfJson?: HoraireCours;

  @IsOptional()
  @IsJSON()
  public planificationPdfJson?: PlanificationCours;
}
