import * as path from 'node:path';
import { Worker } from 'node:worker_threads';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

type PendingRequest = {
  resolve: (vectors: number[][]) => void;
  reject: (error: Error) => void;
};

type EmbedWorkerSuccessMessage = {
  id: number;
  ok: true;
  vectors: number[][];
};

type EmbedWorkerFailureMessage = {
  id: number;
  ok: false;
  error: string;
};

type EmbedWorkerMessage = EmbedWorkerSuccessMessage | EmbedWorkerFailureMessage;

@Injectable()
export class EmbeddingWorkerClient implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingWorkerClient.name);
  private readonly worker: Worker;
  private readonly pending = new Map<number, PendingRequest>();
  private nextRequestId = 1;

  constructor() {
    const workerPath = path.join(__dirname, 'workers', 'bge-m3.worker.js');

    this.worker = new Worker(workerPath, {
      env: process.env,
    });

    this.worker.on('message', (message: unknown) => {
      this.handleWorkerMessage(message);
    });

    this.worker.on('error', (error: Error) => {
      this.logger.error(`Embedding worker error: ${error.message}`, error.stack);
      this.rejectAll(error);
    });

    this.worker.on('exit', (code: number) => {
      if (code !== 0) {
        const error = new Error(`Embedding worker exited with code ${code}`);
        this.logger.error(error.message);
        this.rejectAll(error);
      }
    });
  }

  public embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return Promise.resolve([]);
    }

    const id = this.nextRequestId++;
    const model = process.env.EMBEDDING_MODEL ?? 'Xenova/bge-m3';
    const dtype = process.env.EMBEDDING_DTYPE ?? 'q4';

    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve,
        reject,
      });

      this.worker.postMessage({
        id,
        texts,
        model,
        dtype,
      });
    });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.worker.terminate();
  }

  private handleWorkerMessage(message: unknown): void {
    const parsedMessage = parseEmbedWorkerMessage(message);

    if (!parsedMessage) {
      this.logger.warn('Received invalid message from embedding worker.');
      return;
    }

    const pendingRequest = this.pending.get(parsedMessage.id);

    if (!pendingRequest) {
      this.logger.warn(
        `Received embedding worker response for unknown request id: ${parsedMessage.id}`,
      );
      return;
    }

    this.pending.delete(parsedMessage.id);

    if (parsedMessage.ok) {
      pendingRequest.resolve(parsedMessage.vectors);
      return;
    }

    pendingRequest.reject(new Error(parsedMessage.error));
  }

  private rejectAll(error: Error): void {
    for (const request of this.pending.values()) {
      request.reject(error);
    }

    this.pending.clear();
  }
}

function parseEmbedWorkerMessage(message: unknown): EmbedWorkerMessage | null {
  if (!isRecord(message)) {
    return null;
  }

  const id = message.id;
  const ok = message.ok;

  if (typeof id !== 'number' || !Number.isInteger(id)) {
    return null;
  }

  if (ok === true) {
    const vectors = message.vectors;

    if (!isNumberMatrix(vectors)) {
      return null;
    }

    return {
      id,
      ok: true,
      vectors,
    };
  }

  if (ok === false) {
    const error = message.error;

    if (typeof error !== 'string') {
      return null;
    }

    return {
      id,
      ok: false,
      error,
    };
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberMatrix(value: unknown): value is number[][] {
  return Array.isArray(value) && value.every(isNumberVector);
}

function isNumberVector(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}
