const EXPLICIT_COUNT_PHRASE_PREFIX =
  /^(?:please\s+)?(?:list(?:e|es)?|donne|propose|recommande)[ -]+moi\s+|^(?:please\s+)?(?:list|suggest|recommend|show me|give me)\s+/i;
const REQUESTED_COURSE_COUNT = /^\d+\s+cours(?:es?)?\b\s+/i;
const COURSE_CONTEXT = /^\s*(?:(?:de|en|sur|about|on|in)\s+|d['’])/i;

export function stripRequestedCourseCount(query: string): string {
  const prefix = EXPLICIT_COUNT_PHRASE_PREFIX.exec(query)?.[0];
  if (!prefix) return query.trim();

  const remainder = query.slice(prefix.length);
  const count = REQUESTED_COURSE_COUNT.exec(remainder)?.[0];
  if (!count) return query.trim();

  return remainder.slice(count.length).replace(COURSE_CONTEXT, '').trim();
}
