// import { createRequire } from 'node:module';
// import * as path from 'node:path';
import { parentPort } from 'node:worker_threads';

import { Logger } from '@nestjs/common';

const logger = new Logger('bge-m3.worker');

// onnxruntime-node's napi-v6 native binding cannot re-register with a new V8 isolate
// after being loaded by a previous worker thread in the same process (dlopen keeps the
// .node file mapped but NAPI init only ran for the first isolate). Redirect
// require('onnxruntime-node') → onnxruntime-web so the WASM backend is used instead.
// onnxruntime-web has no native .node binary and loads cleanly across worker threads.
//
// This redirect MUST be applied before @huggingface/transformers is imported, because
// transformers.node.cjs statically requires onnxruntime-node at bundle load time.
// We also pre-load and configure onnxruntime-web here so that when transformers triggers
// the redirect, Node's module cache returns our already-configured instance.
// (onnxruntime-web defaults to blob: URLs for WASM which are not supported in Node.js.)
// eslint-disable-next-line @typescript-eslint/no-require-imports
// const _workerRequire = createRequire(__filename);
// const _nodeModule = _workerRequire('module') as { _load(id: string, ...rest: unknown[]): unknown };
// const _origModLoad = _nodeModule._load;
// _nodeModule._load = function (id: string, ...rest: unknown[]) {
//   return _origModLoad.apply(_nodeModule, [id === 'onnxruntime-node' ? 'onnxruntime-web' : id, ...rest]);
// };

// // Pre-load onnxruntime-web and set wasmPaths before transformers sees it for the first time.
// const _ortWeb = _workerRequire('onnxruntime-web') as {
//   env: { wasm: { wasmPaths?: string; numThreads?: number } };
// };
// _ortWeb.env.wasm.wasmPaths = path.dirname(_workerRequire.resolve('onnxruntime-web')) + path.sep;
// _ortWeb.env.wasm.numThreads = 1;

type EmbedRequest = {
  id: number;
  texts: string[];
  model: string;
  dtype?: string;
};

type EmbedResponse =
  | {
    id: number;
    ok: true;
    vectors: number[][];
  }
  | {
    id: number;
    ok: false;
    error: string;
  };

type TensorLike = {
  data: ArrayLike<number> | Iterable<number>;
  dims?: number[];
};

type FeatureExtractionOptions = {
  pooling: 'cls';
  normalize: boolean;
  truncation?: boolean;
  max_length?: number;
};

type FeatureExtractor = (
  texts: string | string[],
  options: FeatureExtractionOptions,
) => Promise<TensorLike> | TensorLike;

type ProgressInfo = {
  status?: string;
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

type PipelineOptions = {
  dtype?: string;
  progress_callback?: (progress: ProgressInfo) => void;
};

type PipelineFactory = (
  task: 'feature-extraction',
  model: string,
  options?: PipelineOptions,
) => Promise<FeatureExtractor> | FeatureExtractor;

type TransformersModule = {
  pipeline: PipelineFactory;
  env: {
    cacheDir?: string;
  };
};

type ExtractorState = {
  key: string;
  promise: Promise<FeatureExtractor>;
};

let extractorState: ExtractorState | null = null;

if (parentPort === null) {
  throw new Error('bge-m3.worker.ts must be executed as a worker thread.');
}

const port = parentPort;

port.on('message', (message: unknown) => {
  void handleMessage(message);
});

async function handleMessage(message: unknown): Promise<void> {
  let requestId = extractRequestId(message);

  try {
    const request = parseEmbedRequest(message);
    requestId = request.id;

    if (request.texts.length === 0) {
      const response: EmbedResponse = {
        id: request.id,
        ok: true,
        vectors: [],
      };

      port.postMessage(response);
      return;
    }

    logger.debug(`Request ${request.id}: loading extractor for ${request.texts.length} texts`);
    const extractor = await getExtractor(request.model, request.dtype);

    logger.debug(`Request ${request.id}: running inference on ${request.texts.length} texts (max_length=1024)`);
    const inferenceStart = Date.now();
    const output = await extractor(request.texts, {
      pooling: 'cls',
      normalize: true,
      truncation: true,
      max_length: 1024,
    });
    logger.debug(`Request ${request.id}: inference done in ${Date.now() - inferenceStart}ms`);

    logger.debug(`Request ${request.id}: converting tensor to vectors`);
    const vectors = tensorToVectors(output, request.texts.length);
    logger.debug(`Request ${request.id}: done, returning ${vectors.length} vectors`);

    const response: EmbedResponse = {
      id: request.id,
      ok: true,
      vectors,
    };

    port.postMessage(response);
  } catch (error) {
    if (requestId === -1) {
      logger.error('Cannot reply: message had no valid id, dropping error response');
      return;
    }

    const response: EmbedResponse = {
      id: requestId,
      ok: false,
      error: formatError(error),
    };

    port.postMessage(response);
  }
}

async function getExtractor(
  model: string,
  dtype?: string,
): Promise<FeatureExtractor> {
  const key = `${model}:${dtype ?? 'default'}`;

  if (extractorState?.key !== key) {
    const promise = createExtractor(model, dtype);
    // Reset on failure so the next request retries model loading instead of
    // replaying the same rejection forever.
    promise.catch(() => {
      if (extractorState?.key === key) {
        extractorState = null;
      }
    });
    extractorState = { key, promise };
  }

  return extractorState.promise;
}

async function createExtractor(
  model: string,
  dtype?: string,
): Promise<FeatureExtractor> {
  logger.log(`Loading model: ${model} (dtype=${dtype ?? 'default'})`);

  const transformersModule = (await import(
    '@huggingface/transformers'
  )) as unknown as TransformersModule;

  if (process.env.TRANSFORMERS_CACHE_DIR) {
    transformersModule.env.cacheDir = process.env.TRANSFORMERS_CACHE_DIR;
  }

  // const options: PipelineOptions = {};

  // if (dtype) {
  //   options.dtype = dtype;
  // }

  // const extractor = await transformersModule.pipeline('feature-extraction', model, options);

  const options: PipelineOptions = {
    progress_callback: (progress) => {
      logger.log(`Model loading progress: ${JSON.stringify(progress)}`);
    },
  };

  if (dtype) {
    options.dtype = dtype;
  }

  const extractor = await transformersModule.pipeline(
    'feature-extraction',
    model,
    options,
  );
    
  logger.log(`Model ready: ${model}`);

  return extractor;
}

function parseEmbedRequest(message: unknown): EmbedRequest {
  if (!isRecord(message)) {
    throw new Error('Invalid worker message: expected an object.');
  }

  const id = message.id;
  const texts = message.texts;
  const model = message.model;
  const dtype = message.dtype;

  if (typeof id !== 'number' || !Number.isInteger(id)) {
    throw new TypeError('Invalid worker message: "id" must be an integer.');
  }

  if (!Array.isArray(texts) || !texts.every((text) => typeof text === 'string')) {
    throw new Error('Invalid worker message: "texts" must be a string array.');
  }

  if (typeof model !== 'string' || model.trim().length === 0) {
    throw new Error('Invalid worker message: "model" must be a non-empty string.');
  }

  if (dtype !== undefined && typeof dtype !== 'string') {
    throw new Error('Invalid worker message: "dtype" must be a string when provided.');
  }

  const request: EmbedRequest = {
    id,
    texts,
    model,
  };

  if (typeof dtype === 'string' && dtype.trim().length > 0) {
    request.dtype = dtype;
  }

  return request;
}

function tensorToVectors(
  output: TensorLike,
  expectedBatchSize: number,
): number[][] {
  const data = Array.from(output.data);

  if (data.length === 0) {
    throw new Error('Embedding output is empty.');
  }

  if (output.dims?.length === 2) {
    const [batchSize, vectorSize] = output.dims;

    if (!Number.isInteger(batchSize) || !Number.isInteger(vectorSize)) {
      throw new TypeError(`Invalid embedding tensor dims: ${output.dims.join(', ')}.`);
    }

    if (batchSize !== expectedBatchSize) {
      throw new Error(
        `Unexpected embedding batch size: got ${batchSize}, expected ${expectedBatchSize}.`,
      );
    }

    return splitVectorData(data, batchSize, vectorSize);
  }

  if (expectedBatchSize === 1) {
    return [data];
  }

  if (data.length % expectedBatchSize !== 0) {
    throw new Error(
      `Cannot split embedding tensor: data length ${data.length}, batch size ${expectedBatchSize}.`,
    );
  }

  return splitVectorData(
    data,
    expectedBatchSize,
    data.length / expectedBatchSize,
  );
}

function splitVectorData(
  data: number[],
  batchSize: number,
  vectorSize: number,
): number[][] {
  const vectors: number[][] = [];

  for (let index = 0; index < batchSize; index++) {
    const start = index * vectorSize;
    const end = start + vectorSize;

    vectors.push(data.slice(start, end));
  }

  return vectors;
}

function extractRequestId(message: unknown): number {
  if (
    isRecord(message) &&
    typeof message.id === 'number' &&
    Number.isInteger(message.id)
  ) {
    return message.id;
  }

  return -1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}
