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
  // HIVER: Jan 6 – Apr 28, plus Dec 20 – Jan 5 (gap after autumn goes to next hiver)
  {
    trimester: Trimester.HIVER,
    index: 1,
    start: { month: 12, day: 20 }, // 20 décembre (previous year)
    end: { month: 4, day: 28 }, // 28 avril
  },
  // ETE: Apr 29 – Aug 17
  {
    trimester: Trimester.ETE,
    index: 2,
    start: { month: 4, day: 29 }, // 29 avril
    end: { month: 8, day: 17 }, // 17 août
  },
  // AUTOMNE: Aug 18 – Dec 19
  {
    trimester: Trimester.AUTOMNE,
    index: 3,
    start: { month: 8, day: 18 }, // 18 août
    end: { month: 12, day: 19 }, // 19 décembre
  },
];


function dateToComparable(month: number, day: number): number {
  // e.g. Jan 1 => 101, Dec 31 => 1231
  return month * 100 + day;
}

export function isDateInRange(
  date: { month: number; day: number },
  start: { month: number; day: number },
  end: { month: number; day: number },
): boolean {
  const d = dateToComparable(date.month, date.day);
  const s = dateToComparable(start.month, start.day);
  const e = dateToComparable(end.month, end.day);
  // If range does not wrap year
  if (s <= e) {
    return d >= s && d <= e;
  }
  // If range wraps year (e.g., Dec 20 – Apr 28)
  return d >= s || d <= e;
}

export function getCurrentSessionIndex(date: Date = new Date()): string | null {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JS months are 0-based
  const day = date.getDate();

  for (const session of SESSION_DATE_RANGES) {
    if (isDateInRange({ month, day }, session.start, session.end)) {
      // Special case: If trimester is HIVER and month is December, assign to next year
      if (session.trimester === Trimester.HIVER && month === 12) {
        return `${year + 1}${session.index}`;
      }
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

  const trimesterIndex = Number.parseInt(yearIndex.slice(-1), 10);
  return getTrimesterByIndex(trimesterIndex);
}

/**
 * Converts a trimester enum value to its corresponding single-letter prefix
 * @param trimester The trimester enum value
 */
export function getTrimesterPrefix(trimester: string): string {
  switch (trimester) {
    case 'HIVER':
      return 'H';
    case 'ETE':
      return 'E';
    case 'AUTOMNE':
      return 'A';
    default:
      logger.error(`Unknown trimester: ${trimester}, using first character`);
      return trimester.charAt(0);
  }
}
