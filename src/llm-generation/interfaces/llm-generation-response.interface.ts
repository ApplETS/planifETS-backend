export interface LlmCourse {
  code: string;
  reason?: string;
}

export function isLlmCourse(value: unknown): value is LlmCourse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const course = value as Record<string, unknown>;
  return (
    typeof course.code === 'string' &&
    (course.reason === undefined || typeof course.reason === 'string')
  );
}
