import chatbotConfig from '../../src/config/chatbot.config';

describe('chatbot.config', () => {
  const originalEnv = process.env.CHATBOT_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CHATBOT_ENABLED;
    } else {
      process.env.CHATBOT_ENABLED = originalEnv;
    }
  });

  it('should disable the chatbot by default when CHATBOT_ENABLED is not defined', () => {
    delete process.env.CHATBOT_ENABLED;

    expect(chatbotConfig()).toEqual({ enabled: false });
  });

  it('should disable the chatbot when CHATBOT_ENABLED=false', () => {
    process.env.CHATBOT_ENABLED = 'false';

    expect(chatbotConfig()).toEqual({ enabled: false });
  });

  it('should enable the chatbot when CHATBOT_ENABLED=true', () => {
    process.env.CHATBOT_ENABLED = 'true';

    expect(chatbotConfig()).toEqual({ enabled: true });
  });

  it('should enable the chatbot when CHATBOT_ENABLED=TRUE', () => {
    process.env.CHATBOT_ENABLED = 'TRUE';

    expect(chatbotConfig()).toEqual({ enabled: true });
  });

  it('should disable the chatbot for any value other than true', () => {
    process.env.CHATBOT_ENABLED = 'yes';

    expect(chatbotConfig()).toEqual({ enabled: false });
  });
});
