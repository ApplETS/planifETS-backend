/*
 * Errors related to file extraction
 */

export const ERROR_MESSAGES = {
  ERROR_PARSING_HORAIRE_PDF: 'An error occurred while parsing the Horaire PDF',
  ERROR_PARSING_PLANIFICATION_PDF:
    'An error occurred while parsing the Planification PDF',
  REQUIRED_PDF_URL: 'PDF URL is required and must be valid.',
  REQUIRED_SESSION_AND_PROGRAM_CODE:
    'Session code and program code are required.',
};

export class FileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`File not found in the JAR archive at path: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}

export class FileExtractionError extends Error {
  constructor(message: string) {
    super(`File extraction failed: ${message}`);
    this.name = 'FileExtractionError';
  }
}
