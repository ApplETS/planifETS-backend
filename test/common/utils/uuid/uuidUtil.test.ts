import { uuidV5 } from '@/common/utils/uuid/uuidUtil';

const UUID_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// RFC 4122 DNS namespace — well-known test vector source
const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('uuidV5', () => {
  it('returns a lowercase hyphenated UUID v5 string', () => {
    expect(uuidV5('hello', DNS_NAMESPACE)).toMatch(UUID_V5_REGEX);
  });

  it('is deterministic for the same name and namespace', () => {
    expect(uuidV5('hello', DNS_NAMESPACE)).toBe(uuidV5('hello', DNS_NAMESPACE));
  });

  it('produces different UUIDs for different names', () => {
    expect(uuidV5('foo', DNS_NAMESPACE)).not.toBe(uuidV5('bar', DNS_NAMESPACE));
  });

  it('produces different UUIDs for different namespaces', () => {
    const otherNamespace = '5e7f1c4d-3d8a-45f1-87a4-9cf4de6f6b29';

    expect(uuidV5('hello', DNS_NAMESPACE)).not.toBe(uuidV5('hello', otherNamespace));
  });

  it('matches RFC 4122 known test vector', () => {
    // python: import uuid; str(uuid.uuid5(uuid.NAMESPACE_DNS, 'python.org'))
    expect(uuidV5('python.org', DNS_NAMESPACE)).toBe('886313e1-3b8a-5372-9b90-0c9aee199e5d');
  });
});
