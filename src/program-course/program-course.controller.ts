import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  ParseArrayPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ProgramCoursesDetailedDto } from './dtos/program-course-detailed.dto';
import { ProgramCourseService } from './program-course.service';

@ApiTags('Program courses')
@Controller('program-courses')
export class ProgramCourseController {
  private readonly logger = new Logger(ProgramCourseController.name);

  constructor(private readonly programCourseService: ProgramCourseService) {}

  @Get('')
  @ApiOperation({ summary: 'Get detailed program courses by program codes' })
  @ApiQuery({
    name: 'programCodes',
    type: String,
    description: 'Comma-separated list of program codes (ex: 7086,7687)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed program courses',
  })
  @ApiResponse({ status: 400, description: 'Invalid or missing program codes' })
  @ApiResponse({
    status: 404,
    description: 'No programs found for the provided codes',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  public async getProgramsCoursesDetailedByCode(
    @Query(
      'programCodes',
      new ParseArrayPipe({ items: String, separator: ',' }),
    )
    programCodes: string[],
  ): Promise<{
    data: ProgramCoursesDetailedDto[];
    errors?: { invalidProgramCodes: string[] };
  }> {
    try {
      if (!programCodes || programCodes.length === 0) {
        throw new HttpException(
          'Program codes are required to get detailed program courses',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result =
        await this.programCourseService.getProgramsCoursesDetailedByCode(
          programCodes,
        );

      if (result.data.length > 0) {
        return result;
      }

      throw new NotFoundException('No programs found for the provided codes');
    } catch (error) {
      this.logger.error('Error fetching detailed program courses', {
        programCodes,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('No programs found')) {
        throw new NotFoundException(errorMessage);
      }

      throw new HttpException(
        'Failed to retrieve program courses: ' + errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
