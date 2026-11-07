const EXPLICIT_COUNT_PHRASE_PREFIX =
  /^(?:please\s+)?(?:(?:list(?:e|es)?|donne|propose|recommande)[ -]+moi|list|suggest|recommend|show me|give me)\s+/i;
const REQUESTED_COURSE_COUNT = /^\d+\s+(?:cours|courses?)\b\s+/i;
const COURSE_CONTEXT = /^\s*(?:(?:de|en|sur|about|on|in)\s+|d['’])/i;

export function stripRequestedCourseCount(query: string): string {
  const prefix = query.match(EXPLICIT_COUNT_PHRASE_PREFIX)?.[0];
  if (!prefix) return query.trim();

  const remainder = query.slice(prefix.length);
  const count = remainder.match(REQUESTED_COURSE_COUNT)?.[0];
  if (!count) return query.trim();

  return remainder.slice(count.length).replace(COURSE_CONTEXT, '').trim();
}
