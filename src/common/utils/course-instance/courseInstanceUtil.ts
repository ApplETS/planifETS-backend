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

    const frequencyMapA = AvailabilityUtil.buildFrequencyMap(a);
    const frequencyMapB = AvailabilityUtil.buildFrequencyMap(b);

    for (const [availability, count] of frequencyMapA.entries()) {
      if (frequencyMapB.get(availability) !== count) {
        return false;
      }
    }

    return true;
  }

  // Builds a frequency map of the Availability enums
  private static buildFrequencyMap(
    availabilities: Availability[],
  ): Map<Availability, number> {
    const frequencyMap = new Map<Availability, number>();
    for (const availability of availabilities) {
      frequencyMap.set(availability, (frequencyMap.get(availability) || 0) + 1);
    }
    return frequencyMap;
  }
}
