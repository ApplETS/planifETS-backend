import { InternalServerErrorException } from '@nestjs/common';

export class LlmExhaustedException extends InternalServerErrorException {
  constructor(cause?: Error) {
    super('All LLM providers have been exhausted without a successful response.', { cause });
  }
}
