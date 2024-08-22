import * as path from 'path';

export default () => ({
  pdfOutputPath: path.resolve(__dirname, '../../test'),
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
});
