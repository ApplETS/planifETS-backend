import { extractNumberFromString, formatMessage, stripHtmlTags } from "@/common/utils/stringUtil";

describe('extractNumberFromString', () => {
  it('should extract the first number from a string', () => {
    expect(extractNumberFromString('cycle123')).toBe(123);
    expect(extractNumberFromString('abc42def')).toBe(42);
    expect(extractNumberFromString('no numbers')).toBe(0);
    expect(extractNumberFromString('')).toBe(0);
    expect(extractNumberFromString('2025-12-24')).toBe(2025);
  });
});

describe('stripHtmlTags', () => {
  it('should remove HTML tags and decode entities', () => {
    expect(stripHtmlTags('<b>Hello</b>')).toBe('Hello');
    expect(stripHtmlTags('Hello &amp; welcome')).toBe('Hello & welcome');
    expect(stripHtmlTags('A&nbsp;B')).toBe('A B');
    expect(stripHtmlTags('<div>Test &lt;tag&gt;</div>')).toBe('Test <tag>');
    expect(stripHtmlTags('<p>Line1</p><p>Line2</p>')).toBe('Line1Line2');
    expect(stripHtmlTags('')).toBe('');
    expect(stripHtmlTags(undefined as never)).toBe(undefined);
    expect(stripHtmlTags('No tags')).toBe('No tags');
    expect(stripHtmlTags('<span>&quot;Hello&quot; &apos;World&apos;</span>')).toBe(`"Hello" 'World'`);
    expect(stripHtmlTags('<b>   spaced   </b>')).toBe('spaced');
    expect(stripHtmlTags('<b>multi   space</b>   <i>test</i>')).toBe('multi space test');
  });
});

describe('formatMessage', () => {
  it('should return the string as is', () => {
    expect(formatMessage('hello')).toBe('hello');
  });
  it('should return the message from an Error', () => {
    expect(formatMessage(new Error('fail'))).toBe('fail');
  });
  it('should stringify objects', () => {
    expect(formatMessage({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}');
  });
  it('should handle unstringifiable objects', () => {
    type Circular = { self?: Circular };
    const circular: Circular = {};
    circular.self = circular;
    expect(formatMessage(circular)).toBe('[Unstringifiable Object]');
  });
  it('should handle other types', () => {
    expect(formatMessage(123 as never)).toBe('123');
    expect(formatMessage(null as never)).toBe('null');
    expect(formatMessage(undefined as never)).toBe('undefined');
  });
});
