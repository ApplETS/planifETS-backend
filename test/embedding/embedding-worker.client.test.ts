import type { ChildProcess } from 'node:child_process';
import { fork } from 'node:child_process';
import * as fs from 'node:fs';

import { EmbeddingWorkerClient } from '../../src/embedding/embedding-worker.client';

jest.mock('node:fs');
jest.mock('node:child_process');

const mockFsExistsSync = jest.mocked(fs.existsSync);
const mockFork = jest.mocked(fork);

type ChildProcessEventMap = {
  message: (msg: unknown) => void;
  error: (err: Error) => void;
  exit: (code: number) => void;
};

const buildMockChildProcess = () => {
  const listeners: Partial<ChildProcessEventMap> = {};
  const child = {
    send: jest.fn(),
    kill: jest.fn(),
    on: jest
      .fn()
      .mockImplementation(
        (
          event: keyof ChildProcessEventMap,
          cb: ChildProcessEventMap[typeof event]
        ) => {
          listeners[event] = cb as never;
        }
      ),
    emit: (event: keyof ChildProcessEventMap, ...args: unknown[]) => {
      (listeners[event] as ((...a: unknown[]) => void) | undefined)?.(...args);
    }
  };
  return child;
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
      expect(mockFork).not.toHaveBeenCalled();
    });
  });

  describe('embed — worker not found', () => {
    it('throws when the worker script does not exist on disk', async () => {
      mockFsExistsSync.mockReturnValue(false);
      await expect(client.embed(['hello'])).rejects.toThrow(
        'Embedding worker not found'
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('does nothing when no worker has been created', () => {
      expect(client.onModuleDestroy()).toBeUndefined();
    });

    it('kills the worker and clears the reference', async () => {
      mockFsExistsSync.mockReturnValue(true);
      const mockChild = buildMockChildProcess();
      mockFork.mockReturnValue(mockChild as unknown as ChildProcess);

      void client.embed(['text']);
      client.onModuleDestroy();

      expect(mockChild.kill).toHaveBeenCalledTimes(1);
    });
  });

  describe('embed — message handling', () => {
    let mockChild: ReturnType<typeof buildMockChildProcess>;

    beforeEach(() => {
      mockFsExistsSync.mockReturnValue(true);
      mockChild = buildMockChildProcess();
      mockFork.mockReturnValue(mockChild as unknown as ChildProcess);
    });

    it('resolves with vectors when the worker sends a success message', async () => {
      const vectors = [[0.1, 0.2, 0.3]];
      const embedPromise = client.embed(['hello']);
      mockChild.emit('message', { id: 1, ok: true, vectors });
      await expect(embedPromise).resolves.toStrictEqual(vectors);
    });

    it('rejects when the worker sends a failure message', async () => {
      const embedPromise = client.embed(['hello']);
      mockChild.emit('message', {
        id: 1,
        ok: false,
        error: 'model load failed'
      });
      await expect(embedPromise).rejects.toThrow('model load failed');
    });

    it('warns and ignores messages that do not match any pending request', async () => {
      const warnSpy = jest
        .spyOn(client['logger'], 'warn')
        .mockImplementation(() => {});
      // Start an embed so the worker is created and its message listener is registered
      const embedPromise = client.embed(['hello']);
      mockChild.emit('message', { id: 999, ok: true, vectors: [[0.1]] });
      expect(warnSpy).toHaveBeenCalled();
      // Resolve the pending request to avoid open handles
      mockChild.emit('message', { id: 1, ok: true, vectors: [[0.1]] });
      await embedPromise;
    });

    it('warns and ignores malformed messages from the worker', async () => {
      const warnSpy = jest
        .spyOn(client['logger'], 'warn')
        .mockImplementation(() => {});
      const embedPromise = client.embed(['hello']);

      mockChild.emit('message', { not: 'valid' });
      expect(warnSpy).toHaveBeenCalled();

      // clean up pending promise
      mockChild.emit('message', { id: 1, ok: true, vectors: [[0.1]] });
      await embedPromise;
    });

    it('rejects all pending requests when the worker emits an error', async () => {
      const p1 = client.embed(['text-1']);
      // Force a second request by re-creating worker expectation; both share the same worker
      const p2 = client.embed(['text-2']);

      mockChild.emit('error', new Error('worker crashed'));

      await expect(p1).rejects.toThrow('worker crashed');
      await expect(p2).rejects.toThrow('worker crashed');
    });

    it('rejects the request and kills the worker when the timeout fires', async () => {
      process.env.EMBEDDING_WORKER_TIMEOUT_MS = '5000';
      const embedPromise = client.embed(['slow text']);

      jest.advanceTimersByTime(5001);

      await expect(embedPromise).rejects.toThrow('timed out');
      expect(mockChild.kill).toHaveBeenCalled();
      delete process.env.EMBEDDING_WORKER_TIMEOUT_MS;
    });
  });
});
