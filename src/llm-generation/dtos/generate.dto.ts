import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches
} from 'class-validator';

import { CHATBOT_ERROR_PROMPT_BLANK } from '@/common/utils/error/error-constants';

class PromptDto {
  @IsString()
  @IsNotEmpty({ message: CHATBOT_ERROR_PROMPT_BLANK })
  @Matches(/\S/, { message: CHATBOT_ERROR_PROMPT_BLANK })
  @ApiProperty({
    example:
      'Je veux apprendre sur l’intelligence artificielle et l’apprentissage automatique'
  })
  public prompt!: string;
}

export class GenerateDto extends PromptDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @ApiPropertyOptional({
    type: [Number],
    example: [182848],
    description:
      'Restrict recommendations to courses belonging to these program IDs'
  })
  public programIds?: number[];
}

export class GenerateStreamDto extends PromptDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '182848',
    description:
      'Semicolon-separated program IDs to restrict recommendations to (ex: `182848;183920`) ' +
      'Sent as a string because EventSource requests carry no JSON body.'
  })
  public programIds?: string;
}

class LlmCourseDto {
  @ApiProperty({ example: 'LOG635' })
  public code!: string;

  @ApiProperty({
    example:
      'Covers the core concepts behind AI and machine learning workflows.',
    required: false
  })
  public reason?: string;
}

export class GenerateResponseDto {
  @ApiProperty({ type: [LlmCourseDto] })
  public courses!: LlmCourseDto[];

  @ApiProperty({
    example: 'These courses cover the fundamentals of AI and ML.'
  })
  public explanation!: string;
}

export class ProviderStatusDto {
  @ApiProperty({ example: 'Groq (llama-3.3-70b-versatile)' })
  public name!: string;

  @ApiProperty({ enum: ['ok', 'error'] })
  public status!: 'ok' | 'error';

  @ApiProperty({ example: 342, description: 'Response time in milliseconds' })
  public latencyMs!: number;

  @ApiProperty({ required: false, example: 'API error: 429' })
  public error?: string;
}

export class StatusResponseDto {
  @ApiProperty({ type: [ProviderStatusDto] })
  public providers!: ProviderStatusDto[];
}
