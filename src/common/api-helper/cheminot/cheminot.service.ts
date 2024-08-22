import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CheminotService {
  private logger = new Logger(CheminotService.name);
}
