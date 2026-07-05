export function sanitizeEmbeddingText(
  value: string | null | undefined
): string {
  return normalizeWhitespace(
    (value ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll(String.raw`\"`, '"')
      .replaceAll('\\', ' ')
  );
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function buildQueryEmbeddingText(query: string): string {
  const cleaned = sanitizeEmbeddingText(query);
  const keywords = extractFrenchKeywords(cleaned);

  return normalizeWhitespace([cleaned, keywords].filter(Boolean).join(' '));
}

export function appendEmbeddingKeywords(text: string): string {
  const cleaned = sanitizeEmbeddingText(text);
  const keywords = extractFrenchKeywords(cleaned);

  return normalizeWhitespace([cleaned, keywords].filter(Boolean).join(' '));
}

function extractFrenchKeywords(value: string): string {
  const stopWords = new Set([
    'je',
    'j',
    'tu',
    'il',
    'elle',
    'on',
    'nous',
    'vous',
    'ils',
    'elles',

    'le',
    'la',
    'les',
    'un',
    'une',
    'des',
    'du',
    'de',
    'd',
    'a',
    'à',
    'au',
    'aux',

    'ce',
    'cet',
    'cette',
    'ces',
    'mon',
    'ma',
    'mes',
    'ton',
    'ta',
    'tes',
    'son',
    'sa',
    'ses',

    'et',
    'ou',
    'mais',
    'donc',
    'or',
    'ni',
    'car',

    'pour',
    'sur',
    'dans',
    'avec',
    'sans',
    'par',
    'vers',
    'chez',
    'entre',

    'qui',
    'que',
    'quoi',
    'dont',
    'où',

    'est',
    'sont',
    'etre',
    'être',
    'avoir',
    'ai',
    'as',
    'ont',

    'veux',
    'voudrais',
    'cherche',
    'recherche',
    'apprendre',
    'cours'
  ]);

  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9+.#-]+/i)
    .filter((token) => token.length >= 3)
    .filter((token) => !stopWords.has(token))
    .join(' ');
}
