import { Availability } from '@prisma/client';

import { AvailabilityUtil } from '@/common/utils/course-instance/courseInstanceUtil';

describe('AvailabilityUtil', () => {
  describe('parseAvailability', () => {
    it('should parse valid single code', () => {
      expect(AvailabilityUtil.parseAvailability('J')).toEqual([
        Availability.JOUR
      ]);
      expect(AvailabilityUtil.parseAvailability('S')).toEqual([
        Availability.SOIR
      ]);
      expect(AvailabilityUtil.parseAvailability('I')).toEqual([
        Availability.INTENSIF
      ]);
    });

    it('should parse valid multiple codes (no duplicates)', () => {
      expect(AvailabilityUtil.parseAvailability('JS')).toEqual([
        Availability.JOUR,
        Availability.SOIR
      ]);
      expect(AvailabilityUtil.parseAvailability('SI')).toEqual([
        Availability.SOIR,
        Availability.INTENSIF
      ]);
      expect(AvailabilityUtil.parseAvailability('JIS')).toEqual([
        Availability.JOUR,
        Availability.INTENSIF,
        Availability.SOIR
      ]);
    });

    it('should ignore case and remove duplicates', () => {
      expect(AvailabilityUtil.parseAvailability('jjs')).toEqual([
        Availability.JOUR,
        Availability.SOIR
      ]);
      expect(AvailabilityUtil.parseAvailability('sijj')).toEqual([
        Availability.SOIR,
        Availability.INTENSIF,
        Availability.JOUR
      ]);
    });

    it('should return null for invalid code', () => {
      expect(AvailabilityUtil.parseAvailability('X')).toBeNull();
      expect(AvailabilityUtil.parseAvailability('JX')).toBeNull();
      expect(AvailabilityUtil.parseAvailability('')).toEqual([]);
    });
  });

  describe('parseAvailabilityFromTime', () => {
    it('should infer day availability from morning and afternoon times', () => {
      expect(AvailabilityUtil.parseAvailabilityFromTime('09:00 - 12:30')).toBe(
        Availability.JOUR
      );
      expect(AvailabilityUtil.parseAvailabilityFromTime('13:30 - 15:30')).toBe(
        Availability.JOUR
      );
      expect(AvailabilityUtil.parseAvailabilityFromTime('17:59 - 20:00')).toBe(
        Availability.JOUR
      );
    });

    it('should infer evening availability from late times', () => {
      expect(AvailabilityUtil.parseAvailabilityFromTime('18:00 - 21:00')).toBe(
        Availability.SOIR
      );
      expect(AvailabilityUtil.parseAvailabilityFromTime('19:00 - 22:00')).toBe(
        Availability.SOIR
      );
    });

    it('should return null for missing or malformed times', () => {
      expect(AvailabilityUtil.parseAvailabilityFromTime('')).toBeNull();
      expect(AvailabilityUtil.parseAvailabilityFromTime('TBD')).toBeNull();
      expect(
        AvailabilityUtil.parseAvailabilityFromTime('9:00 - 12:30')
      ).toBeNull();
    });
  });

  describe('areAvailabilitiesEqual', () => {
    it('should return true for equal arrays (same order)', () => {
      expect(
        AvailabilityUtil.areAvailabilitiesEqual(
          [Availability.JOUR, Availability.SOIR],
          [Availability.JOUR, Availability.SOIR]
        )
      ).toBe(true);
    });

    it('should return true for equal arrays (different order)', () => {
      expect(
        AvailabilityUtil.areAvailabilitiesEqual(
          [Availability.SOIR, Availability.JOUR],
          [Availability.JOUR, Availability.SOIR]
        )
      ).toBe(true);
    });

    it('should return false for arrays with different elements', () => {
      expect(
        AvailabilityUtil.areAvailabilitiesEqual(
          [Availability.JOUR],
          [Availability.SOIR]
        )
      ).toBe(false);
    });

    it('should return false for arrays with different lengths', () => {
      expect(
        AvailabilityUtil.areAvailabilitiesEqual(
          [Availability.JOUR],
          [Availability.JOUR, Availability.SOIR]
        )
      ).toBe(false);
    });
  });
});
