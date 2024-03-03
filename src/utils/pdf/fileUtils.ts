import fs from 'fs';
import path from 'path';

export function writeDataToFile(
  data: any,
  fileName: string,
): Promise<string | null> {
  const outputPath = './test/pdf/output';
  const filePath = path.join(outputPath, fileName);

  return new Promise((resolve, reject) => {
    const urlDecodeReplacer = (key: string, value: string) => {
      if (typeof value === 'string') {
        try {
          // Decode the value
          return decodeURIComponent(value);
        } catch (error) {
          throw new Error(
            `Code error ${error.code} while fetching PDF from URL: ${error.message}`,
          );
        }
      }
      return value;
    };

    fs.writeFile(
      filePath,
      JSON.stringify(data, urlDecodeReplacer, 2),
      (err) => {
        if (err) {
          console.error('Error encountered while writing file: ', err);
          reject(err);
        } else {
          console.log(`File "${fileName}" successfully written`);
          resolve(data);
        }
      },
    );
  });
}
