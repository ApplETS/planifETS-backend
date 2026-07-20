import { ConfigModule, registerAs } from '@nestjs/config';

const chatbotConfig = registerAs('chatbot', () => ({
  enabled: (process.env.CHATBOT_ENABLED ?? 'false').toLowerCase() === 'true'
}));

export default chatbotConfig;

export const rootConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  load: [chatbotConfig]
});
