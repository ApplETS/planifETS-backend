const REQUESTED_COURSE_COUNT = /^(?:please\s+)?(?:(?:list(?:e|es)?|donne|propose|recommande)[ -]+moi|list|suggest|recommend|show me|give me)\s+\d+\s+(?:cours|courses?)\b\s+(?:(?:de|en|sur|about|on|in)\s+|d['’])?/i;

export function stripRequestedCourseCount(query: string): string {
  return query.replace(REQUESTED_COURSE_COUNT, '').trim();
}
