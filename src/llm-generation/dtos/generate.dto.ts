import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'I want to learn about artificial intelligence and machine learning' })
  public prompt!: string;
}

class LlmCourseDto {
  @ApiProperty({ example: 'LOG635' })
  public code!: string;
}

export class GenerateResponseDto {
  @ApiProperty({ type: [LlmCourseDto] })
  public courses!: LlmCourseDto[];

  @ApiProperty({ example: 'These courses cover the fundamentals of AI and ML.' })
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
