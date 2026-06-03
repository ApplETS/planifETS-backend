import { parentPort } from 'node:worker_threads';

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
  pooling: 'mean';
  normalize: boolean;
  truncation?: boolean;
  max_length?: number;
};

type FeatureExtractor = (
  texts: string | string[],
  options: FeatureExtractionOptions,
) => Promise<TensorLike> | TensorLike;

type PipelineOptions = {
  dtype?: string;
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

    const extractor = await getExtractor(request.model, request.dtype);

    const output = await extractor(request.texts, {
      pooling: 'mean',
      normalize: true,
      truncation: true,
      max_length: 8192,
    });

    const vectors = tensorToVectors(output, request.texts.length);

    const response: EmbedResponse = {
      id: request.id,
      ok: true,
      vectors,
    };

    port.postMessage(response);
  } catch (error) {
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

  if (!extractorState || extractorState.key !== key) {
    extractorState = {
      key,
      promise: createExtractor(model, dtype),
    };
  }

  return extractorState.promise;
}

async function createExtractor(
  model: string,
  dtype?: string,
): Promise<FeatureExtractor> {
  const transformersModule = (await import(
    '@huggingface/transformers'
  )) as unknown as TransformersModule;

  if (process.env.TRANSFORMERS_CACHE_DIR) {
    transformersModule.env.cacheDir = process.env.TRANSFORMERS_CACHE_DIR;
  }

  const options: PipelineOptions = {};

  if (dtype) {
    options.dtype = dtype;
  }

  return transformersModule.pipeline('feature-extraction', model, options);
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
    throw new Error('Invalid worker message: "id" must be an integer.');
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

  if (output.dims && output.dims.length === 2) {
    const [batchSize, vectorSize] = output.dims;

    if (!Number.isInteger(batchSize) || !Number.isInteger(vectorSize)) {
      throw new Error(`Invalid embedding tensor dims: ${output.dims.join(', ')}.`);
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
