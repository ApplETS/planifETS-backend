export function extractNumberFromString(cycle: string): number {
  const match = RegExp(/\d+/).exec(cycle);

  return match ? parseInt(match[0], 10) : 0;
}

export function stripHtmlTags(text: string): string {
  if (!text) {
    return text;
  }

  // Remove HTML tags but keep the content inside
  let stripped = text.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  stripped = stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Clean up extra whitespace
  return stripped.replace(/\s+/g, ' ').trim();
}

export const formatMessage = (message: string | Error | object): string => {
  if (typeof message === 'string') {
    return message;
  }
  if (message instanceof Error) {
    return message.message;
  }
  if (typeof message === 'object') {
    try {
      return JSON.stringify(message);
    } catch {
      return '[Unstringifiable Object]';
    }
  }
  return String(message);
}
