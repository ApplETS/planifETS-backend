import { Availability } from '@prisma/client';

import { AvailabilityUtil } from '@/common/utils/course-instance/courseInstanceUtil';

describe('AvailabilityUtil', () => {
  describe('parseAvailability', () => {
    it('should parse valid single code', () => {
      expect(AvailabilityUtil.parseAvailability('J')).toEqual([Availability.JOUR]);
      expect(AvailabilityUtil.parseAvailability('S')).toEqual([Availability.SOIR]);
      expect(AvailabilityUtil.parseAvailability('I')).toEqual([Availability.INTENSIF]);
    });

    it('should parse valid multiple codes (no duplicates)', () => {
      expect(AvailabilityUtil.parseAvailability('JS')).toEqual([
        Availability.JOUR,
        Availability.SOIR,
      ]);
      expect(AvailabilityUtil.parseAvailability('SI')).toEqual([
        Availability.SOIR,
        Availability.INTENSIF,
      ]);
      expect(AvailabilityUtil.parseAvailability('JIS')).toEqual([
        Availability.JOUR,
        Availability.INTENSIF,
        Availability.SOIR,
      ]);
    });

    it('should ignore case and remove duplicates', () => {
      expect(AvailabilityUtil.parseAvailability('jjs')).toEqual([
        Availability.JOUR,
        Availability.SOIR,
      ]);
      expect(AvailabilityUtil.parseAvailability('sijj')).toEqual([
        Availability.SOIR,
        Availability.INTENSIF,
        Availability.JOUR,
      ]);
    });

    it('should return null for invalid code', () => {
      expect(AvailabilityUtil.parseAvailability('X')).toBeNull();
      expect(AvailabilityUtil.parseAvailability('JX')).toBeNull();
      expect(AvailabilityUtil.parseAvailability('')).toEqual([]);
    });
  });

  describe('areAvailabilitiesEqual', () => {
    it('should return true for equal arrays (same order)', () => {
      expect(
        AvailabilityUtil.areAvailabilitiesEqual(
          [Availability.JOUR, Availability.SOIR],
          [Availability.JOUR, Availability.SOIR],
        ),
      ).toBe(true);
    });

    it('should return true for equal arrays (different order)', () => {
      expect(
        AvailabilityUtil.areAvailabilitiesEqual(
          [Availability.SOIR, Availability.JOUR],
          [Availability.JOUR, Availability.SOIR],
        ),
      ).toBe(true);
    });

    it('should return false for arrays with different elements', () => {
      expect(
        AvailabilityUtil.areAvailabilitiesEqual(
          [Availability.JOUR],
          [Availability.SOIR],
        ),
      ).toBe(false);
    });

    it('should return false for arrays with different lengths', () => {
      expect(
        AvailabilityUtil.areAvailabilitiesEqual(
          [Availability.JOUR],
          [Availability.JOUR, Availability.SOIR],
        ),
      ).toBe(false);
    });
  });
});
