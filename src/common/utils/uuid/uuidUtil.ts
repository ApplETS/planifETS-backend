import { createHash } from 'node:crypto';

// produces stable reproducible identifier (name, namespace) 
export function uuidV5(name: string, namespace: string): string {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from(name, 'utf8');

  const hash = createHash('sha1')
    .update(namespaceBytes)
    .update(nameBytes)
    .digest();

  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  return [
    hash.subarray(0, 4).toString('hex'),
    hash.subarray(4, 6).toString('hex'),
    hash.subarray(6, 8).toString('hex'),
    hash.subarray(8, 10).toString('hex'),
    hash.subarray(10, 16).toString('hex'),
  ].join('-');
}
