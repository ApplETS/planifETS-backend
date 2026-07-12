import { HttpException } from '@nestjs/common';
import { AxiosError } from 'axios';

export function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as Record<string, unknown>).isAxiosError === true
  );
}

export function extractHttpExceptionMessage(exception: HttpException): string {
  const body =
    typeof exception.getResponse === 'function'
      ? exception.getResponse()
      : undefined;

  if (typeof body === 'string') {
    return body;
  }

  const message = (body as { message?: string | string[] })?.message;
  if (Array.isArray(message)) {
    return message[0] ?? exception.message;
  }
  if (typeof message === 'string') {
    return message;
  }

  return exception.message || 'Internal Server Error';
}
