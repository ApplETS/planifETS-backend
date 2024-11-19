import { Logger } from '@nestjs/common';
import { Trimester } from '@prisma/client';

const logger = new Logger('SessionUtil');

interface SessionDateRange {
  trimester: Trimester;
  index: number;
  start: { month: number; day: number };
  end: { month: number; day: number };
}

const SESSION_DATE_RANGES: SessionDateRange[] = [
  {
    trimester: Trimester.HIVER,
    index: 1,
    start: { month: 1, day: 6 }, // 6 janvier
    end: { month: 4, day: 28 }, // 28 avril
  },
  {
    trimester: Trimester.ETE,
    index: 2,
    start: { month: 5, day: 6 }, // 6 mai
    end: { month: 8, day: 17 }, // 17 août
  },
  {
    trimester: Trimester.AUTOMNE,
    index: 3,
    start: { month: 9, day: 3 }, // 3 septembre
    end: { month: 12, day: 19 }, // 19 décembre
  },
];

export function isDateInRange(
  date: { month: number; day: number },
  start: { month: number; day: number },
  end: { month: number; day: number },
): boolean {
  if (date.month < start.month || date.month > end.month) {
    return false;
  }

  if (date.month === start.month && date.day < start.day) {
    return false;
  }

  if (date.month === end.month && date.day > end.day) {
    return false;
  }

  return true;
}

export function getCurrentSessionIndex(date: Date = new Date()): string | null {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JS months are 0-based
  const day = date.getDate();

  for (const session of SESSION_DATE_RANGES) {
    if (isDateInRange({ month, day }, session.start, session.end)) {
      return `${year}${session.index}`;
    }
  }

  logger.error(
    `Unable to determine the current trimester for date: ${date.toISOString()}`,
  );
  return null;
}

export function getTrimesterByIndex(index: number): Trimester | null {
  switch (index) {
    case 1:
      return Trimester.HIVER;
    case 2:
      return Trimester.ETE;
    case 3:
      return Trimester.AUTOMNE;
    default:
      return null;
  }
}

export function getTrimesterIndexBySession(trimester: string): number {
  switch (trimester) {
    case 'HIVER':
      return 1;
    case 'ETE':
      return 2;
    case 'AUTOMNE':
      return 3;
    default:
      throw new Error(`Unknown trimester: ${trimester}`);
  }
}

export function getCurrentTrimester(date: Date = new Date()): Trimester | null {
  const yearIndex = getCurrentSessionIndex(date);
  if (!yearIndex) {
    return null;
  }

  const trimesterIndex = parseInt(yearIndex.slice(-1), 10);
  return getTrimesterByIndex(trimesterIndex);
}
