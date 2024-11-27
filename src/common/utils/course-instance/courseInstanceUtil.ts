import { Availability } from '@prisma/client';

export class AvailabilityUtil {
  public static parseAvailability(
    availabilityCode: string,
  ): Availability[] | null {
    const availabilityMap: Record<string, Availability> = {
      J: Availability.JOUR,
      S: Availability.SOIR,
      I: Availability.INTENSIF,
    };

    const availabilities: Availability[] = [];

    for (const char of availabilityCode.toUpperCase()) {
      const availability = availabilityMap[char];
      if (availability) {
        // Prevent duplicates if the same code appears multiple times
        if (!availabilities.includes(availability)) {
          availabilities.push(availability);
        }
      } else {
        // Invalid availability code detected
        return null;
      }
    }

    return availabilities;
  }

  // Compares two arrays of Availability enums for equality, ignoring order.
  public static areAvailabilitiesEqual(
    a: Availability[],
    b: Availability[],
  ): boolean {
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    for (let i = 0; i < sortedA.length; i++) {
      if (sortedA[i] !== sortedB[i]) {
        return false;
      }
    }

    return true;
  }
}
