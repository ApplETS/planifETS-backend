import { registerAs } from '@nestjs/config';

export default registerAs('chatbot', () => ({
  enabled: (process.env.CHATBOT_ENABLED ?? 'false').toLowerCase() === 'true'
}));
