import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class CourseCodeValidationPipe implements PipeTransform {
  /**
   * Transforms the input value after validating it as a course code.
   *
   * @param value The value to be transformed.
   * @returns The original value if valid, otherwise null.
   */
  transform(value: any): any {
    // Check if the value is a string and a valid course code
    if (typeof value === 'string' && this.isValidCourseCode(value)) {
      return value;
    }

    return null;
  }

  /**
   * Validates the course code format.
   *
   * @param courseCode The course code to validate.
   * @returns true if the course code is valid, false otherwise.
   */
  private isValidCourseCode(courseCode: string): boolean {
    courseCode = courseCode.trim();

    // Updated length check to allow 6 or 7 characters
    if (courseCode.length < 6 || courseCode.length > 7) {
      return false;
    }

    // Extract parts of the course code
    const letters = courseCode.substring(0, 3);
    const numbers =
      courseCode.length === 7
        ? courseCode.substring(3, 6)
        : courseCode.substring(3);
    const optionalLetter = courseCode.length === 7 ? courseCode.charAt(6) : '';

    // Validate each part of the course code
    const isLettersValid = /^[A-Za-z]{3}$/.test(letters);
    const isNumbersValid = /^\d{3}$/.test(numbers);
    const isOptionalLetterValid =
      optionalLetter === '' || /^[A-Za-z]$/.test(optionalLetter);

    return isLettersValid && isNumbersValid && isOptionalLetterValid;
  }
}
