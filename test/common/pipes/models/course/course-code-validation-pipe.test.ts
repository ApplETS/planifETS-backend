import { CourseCodeValidationPipe } from '@/common/pipes/models/course/course-code-validation-pipe';

describe('CourseCodeValidationPipe', () => {
  const pipe = new CourseCodeValidationPipe();

  it('accepts standard three-digit course codes', () => {
    expect(pipe.transform('LOG200')).toBe('LOG200');
    expect(pipe.transform('DST202')).toBe('DST202');
  });

  it('accepts four-digit doctoral course codes', () => {
    expect(pipe.transform('DGA1005')).toBe('DGA1005');
    expect(pipe.transform('DGA1031')).toBe('DGA1031');
  });

  it('rejects malformed codes', () => {
    expect(pipe.transform('NOT-A-COURSE')).toBe(false);
    expect(pipe.transform('DGA10055')).toBe(false);
    expect(pipe.transform('LOG20')).toBe(false);
    expect(pipe.transform('log200')).toBe(false);
  });
});
