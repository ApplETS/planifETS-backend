import * as path from 'path';

export default () => ({
  port: parseInt(process.env.PORT) || 3000,
  pdfOutputPath: path.resolve(__dirname, '../../test/pdf/output'),
});
