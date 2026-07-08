import {
  CanActivate,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import chatbotConfig from '../../config/chatbot.config';

@Injectable()
export class ChatbotEnabledGuard implements CanActivate {
  constructor(
    @Inject(chatbotConfig.KEY)
    private readonly chatbotConfiguration: ConfigType<typeof chatbotConfig>
  ) {}

  public canActivate(): boolean {
    if (!this.chatbotConfiguration.enabled) {
      throw new NotFoundException();
    }

    return true;
  }
}
