import { Logger } from '@nestjs/common';
import { Trimester } from '@prisma/client';

import {
  getCurrentSessionIndex,
  getCurrentTrimester,
  getTrimesterByIndex,
  getTrimesterIndexBySession,
  isDateInRange,
} from '@/common/utils/session/sessionUtil';

describe('SessionUtil', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    // Spy on the Logger.prototype.error method
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => { });
  });

  afterAll(() => {
    // Restore all mocks after all tests are done
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  describe('isDateInRange', () => {
    it('should return true when date is within the range', () => {
      const date = { month: 3, day: 15 };
      const start = { month: 1, day: 6 };
      const end = { month: 4, day: 28 };
      expect(isDateInRange(date, start, end)).toBe(true);
    });

    it('should return false when date is before the range', () => {
      const date = { month: 1, day: 5 };
      const start = { month: 1, day: 6 };
      const end = { month: 4, day: 28 };
      expect(isDateInRange(date, start, end)).toBe(false);
    });

    it('should return false when date is after the range', () => {
      const date = { month: 5, day: 1 };
      const start = { month: 1, day: 6 };
      const end = { month: 4, day: 28 };
      expect(isDateInRange(date, start, end)).toBe(false);
    });

    it('should return true when date is exactly on the start date', () => {
      const date = { month: 1, day: 6 };
      const start = { month: 1, day: 6 };
      const end = { month: 4, day: 28 };
      expect(isDateInRange(date, start, end)).toBe(true);
    });

    it('should return true when date is exactly on the end date', () => {
      const date = { month: 4, day: 28 };
      const start = { month: 1, day: 6 };
      const end = { month: 4, day: 28 };
      expect(isDateInRange(date, start, end)).toBe(true);
    });

    it('should handle different months correctly', () => {
      const date = { month: 5, day: 10 };
      const start = { month: 5, day: 6 };
      const end = { month: 8, day: 17 };
      expect(isDateInRange(date, start, end)).toBe(true);
    });

    it('should return false if date month is outside the range', () => {
      const date = { month: 13, day: 1 };
      const start = { month: 1, day: 1 };
      const end = { month: 12, day: 31 };
      expect(isDateInRange(date, start, end)).toBe(false);
    });
  });

  describe('getCurrentSessionIndex', () => {
    afterEach(() => {
      // Restore the real timers after each test
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    it('should return the correct session index for a date within the first trimester', () => {
      const mockDate = new Date('2024-02-15');
      expect(getCurrentSessionIndex(mockDate)).toBe('20241');
      // Ensure 'error' was not called
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should return the correct session index for a date within the second trimester', () => {
      const mockDate = new Date('2024-06-10');
      expect(getCurrentSessionIndex(mockDate)).toBe('20242');
      // Ensure 'error' was not called
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should return the correct session index for a date within the third trimester', () => {
      const mockDate = new Date('2024-10-05');
      expect(getCurrentSessionIndex(mockDate)).toBe('20243');
      // Ensure 'error' was not called
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should return the next trimester for a date in the gap after autumn (Dec 25)', () => {
      // Dec 25 should now be assigned to HIVER of the next year (2025)
      const mockDate = new Date('2024-12-25');
      expect(getCurrentSessionIndex(mockDate)).toBe('20251');
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
    it('should return the next trimester for a date in the gap after autumn (Jan 2)', () => {
      // Jan 2 should be assigned to HIVER
      const mockDate = new Date('2025-01-02');
      expect(getCurrentSessionIndex(mockDate)).toBe('20251');
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should use the current date when no date is provided', () => {
      // Use fake timers to set the current date
      const fixedDate = new Date('2024-07-15');
      jest.useFakeTimers();
      jest.setSystemTime(fixedDate);

      expect(getCurrentSessionIndex()).toBe('20242');
      // Ensure 'error' was not called
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('getTrimesterByIndex', () => {
    it('should return HIVER for index 1', () => {
      expect(getTrimesterByIndex(1)).toBe(Trimester.HIVER);
    });

    it('should return ETE for index 2', () => {
      expect(getTrimesterByIndex(2)).toBe(Trimester.ETE);
    });

    it('should return AUTOMNE for index 3', () => {
      expect(getTrimesterByIndex(3)).toBe(Trimester.AUTOMNE);
    });

    it('should return null for invalid index', () => {
      expect(getTrimesterByIndex(4)).toBeNull();
      expect(getTrimesterByIndex(0)).toBeNull();
      expect(getTrimesterByIndex(-1)).toBeNull();
    });
  });

  describe('getTrimesterIndexBySession', () => {
    it('should return 1 for HIVER', () => {
      expect(getTrimesterIndexBySession('HIVER')).toBe(1);
    });

    it('should return 2 for ETE', () => {
      expect(getTrimesterIndexBySession('ETE')).toBe(2);
    });

    it('should return 3 for AUTOMNE', () => {
      expect(getTrimesterIndexBySession('AUTOMNE')).toBe(3);
    });

    it('should throw an error for unknown trimester', () => {
      expect(() => getTrimesterIndexBySession('PRINTEMPS')).toThrow(
        'Unknown trimester: PRINTEMPS',
      );
      expect(() => getTrimesterIndexBySession('')).toThrow(
        'Unknown trimester: ',
      );
      expect(() => getTrimesterIndexBySession('hiver')).toThrow(
        'Unknown trimester: hiver',
      ); // Case-sensitive
    });
  });

  describe('getCurrentTrimester', () => {
    afterEach(() => {
      // Restore the real timers after each test
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    it('should return the correct trimester for a date within the first trimester', () => {
      const mockDate = new Date('2024-03-15');
      expect(getCurrentTrimester(mockDate)).toBe(Trimester.HIVER);
      // Ensure 'error' was not called
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should return the correct trimester for a date within the second trimester', () => {
      const mockDate = new Date('2024-07-20');
      expect(getCurrentTrimester(mockDate)).toBe(Trimester.ETE);
      // Ensure 'error' was not called
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should return the correct trimester for a date within the third trimester', () => {
      const mockDate = new Date('2024-10-10');
      expect(getCurrentTrimester(mockDate)).toBe(Trimester.AUTOMNE);
      // Ensure 'error' was not called
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should return the next trimester for a date in the gap after autumn (Dec 25)', () => {
      // Dec 25 should now be assigned to HIVER
      const mockDate = new Date('2024-12-25');
      expect(getCurrentTrimester(mockDate)).toBe(Trimester.HIVER);
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
    it('should return the next trimester for a date in the gap after autumn (Jan 2)', () => {
      // Jan 2 should be assigned to HIVER
      const mockDate = new Date('2025-01-02');
      expect(getCurrentTrimester(mockDate)).toBe(Trimester.HIVER);
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should use the current date when no date is provided', () => {
      // Use fake timers to set the current date
      const fixedDate = new Date('2024-11-15');
      jest.useFakeTimers();
      jest.setSystemTime(fixedDate);

      expect(getCurrentTrimester()).toBe(Trimester.AUTOMNE);
      // Ensure 'error' was not called
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });
});
