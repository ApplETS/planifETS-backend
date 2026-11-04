import { EventEmitter } from 'node:events';

import {
  INestApplication,
  ServiceUnavailableException,
  ValidationPipe
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import request from 'supertest';

import chatbotConfig from '../../src/config/chatbot.config';
import { LlmController } from '../../src/llm-generation/llm.controller';
import { LlmService } from '../../src/llm-generation/llm.service';

describe('LlmController', () => {
  let app: INestApplication;

  const llmService = {
    checkStatus: jest.fn(),
    recommendStream: jest.fn()
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

  it('does not expose the removed non-streaming endpoint', async () => {
    await createApp(true);
    const response = await request(app.getHttpServer())
      .post('/chatbot/recommend')
      .send({ prompt: 'AI' });
    expect(response.status).toBe(404);
    expect(llmService.recommendStream).not.toHaveBeenCalled();
  });

  describe('GET /chatbot/recommend/stream', () => {
    it.each(['', '   '])('rejects a blank prompt: %j', async (prompt) => {
      await createApp(true);
      const response = await request(app.getHttpServer())
        .get('/chatbot/recommend/stream')
        .query({ prompt });
      expect(response.status).toBe(400);
      expect(llmService.recommendStream).not.toHaveBeenCalled();
    });
    it('aborts the service signal when the response connection closes', async () => {
      const response = Object.assign(new EventEmitter(), {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        headersSent: true,
        destroyed: false
      });
      let started!: () => void;
      const ready = new Promise<void>((resolve) => {
        started = resolve;
      });
      let signal: AbortSignal | undefined;
      llmService.recommendStream.mockImplementation(async function* (
        _prompt: string,
        _programIds: number[] | undefined,
        abortSignal: AbortSignal
      ) {
        signal = abortSignal;
        yield { type: 'status', data: 'THINKING_AI' };
        started();
        await new Promise<void>((_, reject) => {
          abortSignal.addEventListener(
            'abort',
            () => reject(abortSignal.reason),
            { once: true }
          );
        });
      });
      const controller = new LlmController(llmService as unknown as LlmService);
      const pending = controller.recommendStream(
        { prompt: 'AI' },
        response as unknown as Response
      );
      await ready;
      response.destroyed = true;
      response.emit('close');
      await pending;
      expect(signal?.aborted).toBe(true);
      expect(response.write).toHaveBeenCalledTimes(1);
      expect(response.listenerCount('close')).toBe(0);
    });

    it('preserves an early HTTP 503 before SSE headers are sent', async () => {
      await createApp(true);
      // eslint-disable-next-line @typescript-eslint/require-await
      llmService.recommendStream.mockImplementation(async function* () {
        throw new ServiceUnavailableException(
          'Chatbot is busy. Try again shortly.'
        );
      });
      const response = await request(app.getHttpServer())
        .get('/chatbot/recommend/stream')
        .query({ prompt: 'AI' });
      expect(response.status).toBe(503);
      expect(response.headers['content-type']).not.toContain(
        'text/event-stream'
      );
    });

    it('streams status, reason and courses events as SSE', async () => {
      await createApp(true);

      // eslint-disable-next-line @typescript-eslint/require-await
      llmService.recommendStream.mockImplementation(async function* () {
        yield { type: 'status', data: 'SEARCHING_EMBEDDINGS' };
        yield { type: 'reason', data: 'Hello' };
        yield { type: 'courses', data: [{ code: 'LOG121' }] };
      });

      const response = await request(app.getHttpServer())
        .get('/chatbot/recommend/stream')
        .query({ prompt: 'I want to learn AI' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.text).toContain('event: status');
      expect(response.text).toContain('data: SEARCHING_EMBEDDINGS');
      expect(response.text).toContain('event: reason');
      expect(response.text).toContain('data: "Hello"');
      expect(response.text).toContain('event: courses');
      expect(response.text).toContain('data: [{"code":"LOG121"}]');
    });

    it('JSON-encodes reason strings so numeric tokens, quotes, and newlines round-trip exactly', async () => {
      await createApp(true);
      const chunks = ['LOG', '680', '\n', '"DevOps"', ' à l’ÉTS'];
      // eslint-disable-next-line @typescript-eslint/require-await
      llmService.recommendStream.mockImplementation(async function* () {
        for (const chunk of chunks) yield { type: 'reason', data: chunk };
        yield { type: 'courses', data: [{ code: 'LOG680' }] };
      });
      const response = await request(app.getHttpServer())
        .get('/chatbot/recommend/stream')
        .query({ prompt: 'DevOps' });
      const reasons = response.text
        .split('\n\n')
        .filter((frame) => frame.startsWith('event: reason\n'))
        .map((frame) =>
          JSON.parse(
            frame
              .split('\n')
              .find((line) => line.startsWith('data: '))!
              .slice(6)
          )
        );

      expect(reasons).toEqual(chunks);
    });

    it('parses the semicolon-separated programIds query param before calling the service', async () => {
      await createApp(true);

      // eslint-disable-next-line @typescript-eslint/require-await
      llmService.recommendStream.mockImplementation(async function* () {});

      await request(app.getHttpServer())
        .get('/chatbot/recommend/stream')
        .query({ prompt: 'AI', programIds: '182848;183920' });

      expect(llmService.recommendStream).toHaveBeenCalledWith(
        'AI',
        [182848, 183920],
        expect.any(AbortSignal)
      );
    });

    it('emits an error event when the stream fails mid-flight', async () => {
      await createApp(true);

      // eslint-disable-next-line @typescript-eslint/require-await
      llmService.recommendStream.mockImplementation(async function* () {
        yield { type: 'reason', data: 'partial' };
        throw new Error('provider exploded');
      });

      const response = await request(app.getHttpServer())
        .get('/chatbot/recommend/stream')
        .query({ prompt: 'I want to learn AI' });

      expect(response.status).toBe(200);
      expect(response.text).toContain('event: error');
      expect(response.text).toContain('data: provider exploded');
    });

    it('returns 400 when the prompt query param is missing', async () => {
      await createApp(true);

      const { status } = await request(app.getHttpServer()).get(
        '/chatbot/recommend/stream'
      );

      expect(status).toBe(400);
      expect(llmService.recommendStream).not.toHaveBeenCalled();
    });

    it('returns 404 when CHATBOT_ENABLED=false', async () => {
      await createApp(false);

      const { status } = await request(app.getHttpServer())
        .get('/chatbot/recommend/stream')
        .query({ prompt: 'I want to learn AI' });

      expect(status).toBe(404);
      expect(llmService.recommendStream).not.toHaveBeenCalled();
    });
  });
});
