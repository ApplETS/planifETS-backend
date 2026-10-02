export type JobWorkerResult =
  | { status: 'success'; result: string }
  | { status: 'error'; error: string };
