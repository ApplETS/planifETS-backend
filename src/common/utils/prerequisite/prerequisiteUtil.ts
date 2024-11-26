import { CourseCodeValidationPipe } from '../../pipes/models/course/course-code-validation-pipe';

export function parsePrerequisiteString(
  prerequisiteString: string,
  courseCodeValidationPipe: CourseCodeValidationPipe,
): string[] | null {
  const trimmedPrerequisite = prerequisiteString.trim();

  if (!trimmedPrerequisite) {
    return null;
  }

  // Attempt to validate the entire string as a single course code
  const singleValidation =
    courseCodeValidationPipe.transform(trimmedPrerequisite);
  if (singleValidation !== false) {
    return typeof singleValidation === 'string' ? [singleValidation] : null;
  }

  // If single validation fails, attempt to split and validate multiple course codes
  const courseCodes = trimmedPrerequisite.split(',').map((s) => s.trim());

  const validCourseCodes: string[] = [];
  for (const code of courseCodes) {
    const validatedCode = courseCodeValidationPipe.transform(code);
    if (validatedCode === false) {
      // If any code is invalid, treat the entire prerequisite string as unstructured
      return null;
    }
    if (typeof validatedCode === 'string') {
      validCourseCodes.push(validatedCode);
    }
  }

  return validCourseCodes;
}
