import { HttpException } from '@nestjs/common';

import { extractHttpExceptionMessage } from '@/common/utils/error/errorUtil';

describe('extractHttpExceptionMessage', () => {
  it('returns the response body directly when it is a string', () => {
    const exception = new HttpException('Not found', 404);

    expect(extractHttpExceptionMessage(exception)).toBe('Not found');
  });

  it('returns the first message when the response body carries an array of messages', () => {
    const exception = new HttpException(
      { statusCode: 400, message: ['prompt should not be empty', 'other'] },
      400
    );

    expect(extractHttpExceptionMessage(exception)).toBe(
      'prompt should not be empty'
    );
  });

  it('returns the message when the response body carries a single string message', () => {
    const exception = new HttpException(
      { statusCode: 400, message: 'Bad request' },
      400
    );

    expect(extractHttpExceptionMessage(exception)).toBe('Bad request');
  });

  it('falls back to exception.message when the response body has no message', () => {
    const exception = new HttpException({ statusCode: 500 }, 500);

    expect(extractHttpExceptionMessage(exception)).toBe(exception.message);
  });

  it('falls back to "Internal Server Error" when nothing else is available', () => {
    const exception = new HttpException({ statusCode: 500 }, 500);
    Object.defineProperty(exception, 'message', { value: undefined });

    expect(extractHttpExceptionMessage(exception)).toBe(
      'Internal Server Error'
    );
  });
});
