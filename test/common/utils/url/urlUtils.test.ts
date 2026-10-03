import { isValidUrl } from '@/common/utils/url/urlUtils';

describe('isValidUrl', () => {
  it('should return true for valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true);
    expect(
      isValidUrl(
        'https://horaire.etsmtl.ca/Horairepublication/Planification-7086.pdf'
      )
    ).toBe(true);
    expect(isValidUrl('http://www.etsmtl.ca/letsgoetssurlamap')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidUrl('ftp://ftp.example.com')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('http:/incomplete.com')).toBe(false);
    expect(isValidUrl('://missing.scheme.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('www.example.com')).toBe(false);
  });
});
