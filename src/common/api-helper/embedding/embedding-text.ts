export function sanitizeEmbeddingText(
  value: string | null | undefined
): string {
  return normalizeWhitespace(
    stripHtmlTags(value ?? '')
      .replaceAll('&amp;', '&')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll(String.raw`\"`, '"')
      .replaceAll('\\', ' ')
  );
}

function stripHtmlTags(value: string): string {
  let result = '';
  let insideTag = false;

  for (const char of value) {
    if (char === '<') {
      insideTag = true;
      result += ' ';
      continue;
    }

    if (char === '>') {
      insideTag = false;
      result += ' ';
      continue;
    }

    if (!insideTag) {
      result += char;
    }
  }

  return result;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
