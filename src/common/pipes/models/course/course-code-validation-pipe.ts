import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class CourseCodeValidationPipe implements PipeTransform {
  /**
   * Transforms the input value after validating it as a course code.
   */
  public transform(value: string): string | boolean {
    if (typeof value === 'string' && this.isValidCourseCode(value)) {
      return value;
    }

    return false;
  }

  /**
   * Validates the course code format.
   */
  private isValidCourseCode(courseCode: string): boolean {
    courseCode = courseCode.trim();

    // Updated length check to allow 6 or 7 characters
    if (courseCode.length < 6 || courseCode.length > 7) {
      return false;
    }

    // Extract parts of the course code
    const letters = courseCode.substring(0, 3);
    const numbersOrSuffix = courseCode.substring(3);

    // Validate each part of the course code
    const isPrefixValid = /^[A-Z]{3}$/.test(letters);
    // Doctoral codes use four digits (e.g. DGA1005).
    const isSuffixValid = /^(?:\d{3,4}|EST?|TEST)$/.test(numbersOrSuffix);

    return isPrefixValid && isSuffixValid;
  }
}
