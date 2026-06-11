import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { LlmExhaustedException } from '../../src/llm-generation/exceptions/llm-exhausted.exception';
import { LlmController } from '../../src/llm-generation/llm.controller';
import { LlmService } from '../../src/llm-generation/llm.service';

describe('LlmController', () => {
  let app: INestApplication;
  const llmService = {
    checkStatus: jest.fn(),
    generate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LlmController],
      providers: [{ provide: LlmService, useValue: llmService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('GET /chatbot/status', () => {
    it('returns the list of provider statuses', async () => {
      const statuses = [
        { name: 'Groq (llama-3.3)', status: 'ok', latencyMs: 123 },
        { name: 'Nvidia (nvidia-llama)', status: 'error', latencyMs: 45, error: 'timeout' },
      ];
      llmService.checkStatus.mockResolvedValue(statuses);

      const { status, body } = await request(app.getHttpServer()).get('/chatbot/status');

      expect(status).toBe(200);
      expect(body).toEqual({ providers: statuses });
    });

    it('calls LlmService.checkStatus once', async () => {
      llmService.checkStatus.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/chatbot/status');

      expect(llmService.checkStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /chatbot/generate', () => {
    it('returns 200 with the LLM generation result', async () => {
      const response = { courses: [{ code: 'LOG121' }], explanation: 'Great choice.' };
      llmService.generate.mockResolvedValue(response);

      const { status, body } = await request(app.getHttpServer())
        .post('/chatbot/generate')
        .send({ prompt: 'I want to learn AI' });

      expect(status).toBe(200);
      expect(body).toEqual(response);
      expect(llmService.generate).toHaveBeenCalledWith('I want to learn AI');
    });

    it('returns 400 when the prompt field is missing', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/chatbot/generate')
        .send({});

      expect(status).toBe(400);
      expect(llmService.generate).not.toHaveBeenCalled();
    });

    it('returns 400 when the prompt is an empty string', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/chatbot/generate')
        .send({ prompt: '' });

      expect(status).toBe(400);
      expect(llmService.generate).not.toHaveBeenCalled();
    });

    it('returns 400 when the prompt is not a string', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/chatbot/generate')
        .send({ prompt: 42 });

      expect(status).toBe(400);
      expect(llmService.generate).not.toHaveBeenCalled();
    });

    it('returns 500 when all LLM providers are exhausted', async () => {
      llmService.generate.mockRejectedValue(new LlmExhaustedException());

      const { status } = await request(app.getHttpServer())
        .post('/chatbot/generate')
        .send({ prompt: 'I want to learn AI' });

      expect(status).toBe(500);
    });
  });
});
