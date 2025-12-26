export function isValidUrl(url: string): boolean {
  // Require the URL to start with http:// or https://
  if (!/^https?:\/\//.test(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) && !!parsed.hostname && /^[a-zA-Z0-9.-]+$/.test(parsed.hostname);
  } catch {
    return false;
  }
}
