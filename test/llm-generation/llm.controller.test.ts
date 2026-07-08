import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import chatbotConfig from '../../src/config/chatbot.config';
import { LlmExhaustedException } from '../../src/llm-generation/exceptions/llm-exhausted.exception';
import { LlmController } from '../../src/llm-generation/llm.controller';
import { LlmService } from '../../src/llm-generation/llm.service';

describe('LlmController', () => {
  let app: INestApplication;

  const llmService = {
    checkStatus: jest.fn(),
    recommend: jest.fn()
  };

  async function createApp(chatbotEnabled = true): Promise<void> {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LlmController],
      providers: [
        { provide: LlmService, useValue: llmService },
        {
          provide: chatbotConfig.KEY,
          useValue: { enabled: chatbotEnabled }
        }
      ]
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  }

  afterEach(async () => {
    jest.clearAllMocks();

    if (app) {
      await app.close();
    }
  });

  describe('GET /chatbot/status', () => {
    it('returns the list of provider statuses', async () => {
      await createApp(true);

      const statuses = [
        { name: 'Groq (llama-3.3)', status: 'ok', latencyMs: 123 },
        {
          name: 'Nvidia (nvidia-llama)',
          status: 'error',
          latencyMs: 45,
          error: 'timeout'
        }
      ];

      llmService.checkStatus.mockResolvedValue(statuses);

      const { status, body } = await request(app.getHttpServer()).get(
        '/chatbot/status'
      );

      expect(status).toBe(200);
      expect(body).toEqual({ providers: statuses });
    });

    it('calls LlmService.checkStatus once', async () => {
      await createApp(true);

      llmService.checkStatus.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/chatbot/status');

      expect(llmService.checkStatus).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when CHATBOT_ENABLED=false', async () => {
      await createApp(false);

      const { status } = await request(app.getHttpServer()).get(
        '/chatbot/status'
      );

      expect(status).toBe(404);
      expect(llmService.checkStatus).not.toHaveBeenCalled();
    });
  });

  describe('POST /chatbot/recommend', () => {
    it('returns 200 with the LLM generation result', async () => {
      await createApp(true);

      const response = {
        courses: [{ code: 'LOG121' }],
        explanation: 'Great choice.'
      };

      llmService.recommend.mockResolvedValue(response);

      const { status, body } = await request(app.getHttpServer())
        .post('/chatbot/recommend')
        .send({ prompt: 'I want to learn AI' });

      expect(status).toBe(200);
      expect(body).toEqual(response);
      expect(llmService.recommend).toHaveBeenCalledWith('I want to learn AI');
    });

    it('returns 400 when the prompt field is missing', async () => {
      await createApp(true);

      const { status } = await request(app.getHttpServer())
        .post('/chatbot/recommend')
        .send({});

      expect(status).toBe(400);
      expect(llmService.recommend).not.toHaveBeenCalled();
    });

    it('returns 400 when the prompt is an empty string', async () => {
      await createApp(true);

      const { status } = await request(app.getHttpServer())
        .post('/chatbot/recommend')
        .send({ prompt: '' });

      expect(status).toBe(400);
      expect(llmService.recommend).not.toHaveBeenCalled();
    });

    it('returns 400 when the prompt is not a string', async () => {
      await createApp(true);

      const { status } = await request(app.getHttpServer())
        .post('/chatbot/recommend')
        .send({ prompt: 42 });

      expect(status).toBe(400);
      expect(llmService.recommend).not.toHaveBeenCalled();
    });

    it('returns 500 when all LLM providers are exhausted', async () => {
      await createApp(true);

      llmService.recommend.mockRejectedValue(new LlmExhaustedException());

      const { status } = await request(app.getHttpServer())
        .post('/chatbot/recommend')
        .send({ prompt: 'I want to learn AI' });

      expect(status).toBe(500);
    });

    it('returns 404 when CHATBOT_ENABLED=false', async () => {
      await createApp(false);

      const { status } = await request(app.getHttpServer())
        .post('/chatbot/recommend')
        .send({ prompt: 'I want to learn AI' });

      expect(status).toBe(404);
      expect(llmService.recommend).not.toHaveBeenCalled();
    });
  });
});
