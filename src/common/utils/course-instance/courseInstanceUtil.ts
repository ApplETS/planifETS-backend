import { Availability } from '@prisma/client';

export class AvailabilityUtil {
  public static parseAvailability(
    availabilityCode: string,
  ): Availability | null {
    switch (availabilityCode.toUpperCase()) {
      case 'J':
        return Availability.JOUR;
      case 'S':
        return Availability.SOIR;
      case 'I':
        return Availability.INTENSIF;
      default:
        return null;
    }
  }
}
