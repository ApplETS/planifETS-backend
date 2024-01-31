import fs from 'fs';

export function writeDataToFile(data: any, fileName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlDecodeReplacer = (key: any, value: any) => {
      if (typeof value === 'string') {
        try {
          // Try to decode the value
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
      fileName,
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
