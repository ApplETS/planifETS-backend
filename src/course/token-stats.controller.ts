import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TokenStatsDto } from './dtos/token-stats.dto';
import { TokenStatsService } from './token-stats.service';

@ApiTags('Courses')
@Controller('courses')
export class TokenStatsController {
  constructor(private readonly tokenStatsService: TokenStatsService) {}

  @Get('token-stats')
  @ApiOperation({
    summary:
      'Length distribution of course descriptions (chars + estimated tokens). Use the percentiles to size AI context windows.',
  })
  @ApiOkResponse({ type: TokenStatsDto })
  public getTokenStats(): Promise<TokenStatsDto> {
    return this.tokenStatsService.getTokenStats();
  }
}
