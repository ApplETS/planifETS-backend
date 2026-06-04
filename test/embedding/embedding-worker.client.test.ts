import * as fs from 'node:fs';
import { Worker } from 'node:worker_threads';

import { EmbeddingWorkerClient } from '../../src/embedding/embedding-worker.client';

jest.mock('node:fs');
jest.mock('node:worker_threads');

const mockFsExistsSync = jest.mocked(fs.existsSync);
const MockWorker = jest.mocked(Worker);

type WorkerEventMap = {
  message: (msg: unknown) => void;
  error: (err: Error) => void;
  exit: (code: number) => void;
};

const buildMockWorker = () => {
  const listeners: Partial<WorkerEventMap> = {};
  const worker = {
    postMessage: jest.fn(),
    terminate: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockImplementation((event: keyof WorkerEventMap, cb: WorkerEventMap[typeof event]) => {
      listeners[event] = cb as never;
    }),
    emit: (event: keyof WorkerEventMap, ...args: unknown[]) => {
      (listeners[event] as ((...a: unknown[]) => void) | undefined)?.(...args);
    },
  };
  return worker;
};

describe('EmbeddingWorkerClient', () => {
  let client: EmbeddingWorkerClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    client = new EmbeddingWorkerClient();
    jest.spyOn(client['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(client['logger'], 'debug').mockImplementation(() => {});
    jest.spyOn(client['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(client['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('embed — empty input', () => {
    it('returns an empty array without creating a worker', async () => {
      await expect(client.embed([])).resolves.toStrictEqual([]);
      expect(MockWorker).not.toHaveBeenCalled();
    });
  });

  describe('embed — worker not found', () => {
    it('throws when the worker script does not exist on disk', async () => {
      mockFsExistsSync.mockReturnValue(false);
      await expect(client.embed(['hello'])).rejects.toThrow('Embedding worker not found');
    });
  });

  describe('onModuleDestroy', () => {
    it('resolves immediately when no worker has been created', async () => {
      await expect(client.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('terminates the worker and clears the reference', async () => {
      mockFsExistsSync.mockReturnValue(true);
      const mockWorker = buildMockWorker();
      MockWorker.mockImplementation(() => mockWorker as unknown as Worker);

      void client.embed(['text']);
      await client.onModuleDestroy();

      expect(mockWorker.terminate).toHaveBeenCalledTimes(1);
    });
  });

  describe('embed — message handling', () => {
    let mockWorker: ReturnType<typeof buildMockWorker>;

    beforeEach(() => {
      mockFsExistsSync.mockReturnValue(true);
      mockWorker = buildMockWorker();
      MockWorker.mockImplementation(() => mockWorker as unknown as Worker);
    });

    it('resolves with vectors when the worker sends a success message', async () => {
      const vectors = [[0.1, 0.2, 0.3]];
      const embedPromise = client.embed(['hello']);
      mockWorker.emit('message', { id: 1, ok: true, vectors });
      await expect(embedPromise).resolves.toStrictEqual(vectors);
    });

    it('rejects when the worker sends a failure message', async () => {
      const embedPromise = client.embed(['hello']);
      mockWorker.emit('message', { id: 1, ok: false, error: 'model load failed' });
      await expect(embedPromise).rejects.toThrow('model load failed');
    });

    it('warns and ignores messages that do not match any pending request', async () => {
      const warnSpy = jest.spyOn(client['logger'], 'warn').mockImplementation(() => {});
      // Start an embed so the worker is created and its message listener is registered
      const embedPromise = client.embed(['hello']);
      mockWorker.emit('message', { id: 999, ok: true, vectors: [[0.1]] });
      expect(warnSpy).toHaveBeenCalled();
      // Resolve the pending request to avoid open handles
      mockWorker.emit('message', { id: 1, ok: true, vectors: [[0.1]] });
      await embedPromise;
    });

    it('warns and ignores malformed messages from the worker', async () => {
      const warnSpy = jest.spyOn(client['logger'], 'warn').mockImplementation(() => {});
      const embedPromise = client.embed(['hello']);

      mockWorker.emit('message', { not: 'valid' });
      expect(warnSpy).toHaveBeenCalled();

      // clean up pending promise
      mockWorker.emit('message', { id: 1, ok: true, vectors: [[0.1]] });
      await embedPromise;
    });

    it('rejects all pending requests when the worker emits an error', async () => {
      const p1 = client.embed(['text-1']);
      // Force a second request by re-creating worker expectation; both share the same worker
      const p2 = client.embed(['text-2']);

      mockWorker.emit('error', new Error('worker crashed'));

      await expect(p1).rejects.toThrow('worker crashed');
      await expect(p2).rejects.toThrow('worker crashed');
    });

    it('rejects the request and terminates the worker when the timeout fires', async () => {
      process.env.EMBEDDING_WORKER_TIMEOUT_MS = '5000';
      const embedPromise = client.embed(['slow text']);

      jest.advanceTimersByTime(5001);

      await expect(embedPromise).rejects.toThrow('timed out');
      expect(mockWorker.terminate).toHaveBeenCalled();
      delete process.env.EMBEDDING_WORKER_TIMEOUT_MS;
    });
  });
});
