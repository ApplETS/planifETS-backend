import { CourseCodeValidationPipe } from '@/common/pipes/models/course/course-code-validation-pipe';
import { parsePrerequisiteString } from '@/common/utils/prerequisite/prerequisiteUtil';

describe('parsePrerequisiteString', () => {
  const courseCodeValidationPipe = new CourseCodeValidationPipe();

  it('should return null for blank prerequisite strings', () => {
    const transform = jest.fn();
    const mockPipe = {
      transform,
    } as unknown as CourseCodeValidationPipe;

    expect(parsePrerequisiteString('', mockPipe)).toBeNull();
    expect(parsePrerequisiteString('   ', mockPipe)).toBeNull();
    expect(transform).not.toHaveBeenCalled();
  });

  it('should return a single validated course code when the whole string is valid', () => {
    expect(
      parsePrerequisiteString('  LOG100  ', courseCodeValidationPipe),
    ).toEqual(['LOG100']);
  });

  it('should trim and validate comma-separated course codes', () => {
    const transform = jest.fn((value: string) => {
      if (value === 'LOG100 , MAT145 , PHY332') {
        return false;
      }

      return value;
    });
    const mockPipe = {
      transform,
    } as unknown as CourseCodeValidationPipe;

    expect(
      parsePrerequisiteString('  LOG100 , MAT145 , PHY332  ', mockPipe),
    ).toEqual(['LOG100', 'MAT145', 'PHY332']);

    expect(transform).toHaveBeenNthCalledWith(1, 'LOG100 , MAT145 , PHY332');
    expect(transform).toHaveBeenNthCalledWith(2, 'LOG100');
    expect(transform).toHaveBeenNthCalledWith(3, 'MAT145');
    expect(transform).toHaveBeenNthCalledWith(4, 'PHY332');
  });

  it('should return null when any comma-separated course code is invalid', () => {
    expect(
      parsePrerequisiteString(
        'LOG100, invalid prerequisite, MAT145',
        courseCodeValidationPipe,
      ),
    ).toBeNull();
  });

  it('should return null for unstructured prerequisite strings', () => {
    expect(
      parsePrerequisiteString('LOG100 or MAT145', courseCodeValidationPipe),
    ).toBeNull();
  });

  it('should return null when the validation pipe returns a non-string truthy value', () => {
    const transform = jest.fn().mockReturnValue(true);
    const mockPipe = {
      transform,
    } as unknown as CourseCodeValidationPipe;

    expect(parsePrerequisiteString('LOG100', mockPipe)).toBeNull();
    expect(transform).toHaveBeenCalledWith('LOG100');
  });
});
