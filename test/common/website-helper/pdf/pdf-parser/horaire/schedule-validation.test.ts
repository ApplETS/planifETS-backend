import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Output, Text } from 'pdf2json';

import { HoraireCoursService } from '@/common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';

describe('Schedule PDF consistency', () => {
  const url =
    'https://horaire.etsmtl.ca/HorairePublication/HorairePublication_20271_UQAM.pdf';
  const text = (value: string, x = 0.551, y = 20, bold = false): Text =>
    ({
      x,
      y,
      R: [
        {
          T: encodeURIComponent(value),
          TS: [0, 10.998999999999999, bold ? 1 : 0]
        }
      ]
    }) as unknown as Text;
  const page = () => ({
    Texts: [
      text('HORAIRE HIVER 2027', 13, 4),
      text('COURS', 0.551, 15),
      text('GR', 3.886, 15),
      text('HEURE', 8, 15),
      text('DST202'),
      text('TITLE', 4, 20),
      text('Page : 1/1', 28, 59.302)
    ]
  });
  let service: HoraireCoursService;
  let error: jest.SpyInstance;
  const parse = (pages: ReturnType<typeof page>[]) =>
    (
      service as unknown as {
        processPdfData(data: Output, url: string): unknown;
      }
    ).processPdfData({ Pages: pages } as Output, url);

  beforeEach(() => {
    service = new HoraireCoursService({} as HttpService);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('accepts a consistent single-course schedule without a count threshold', () => {
    expect(parse([page()])).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DST202' })])
    );
  });

  it('logs URL and reason for a footer-only empty PDF', () => {
    expect(() => parse([{ Texts: [text('Page : 1/1', 28, 59.302)] }])).toThrow(
      'missing session heading'
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(`Invalid schedule PDF ${url}:`)
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('existing data preserved')
    );
  });

  it('rejects an unreadable page inside a nonempty document', () => {
    expect(() => parse([page(), { Texts: [] }])).toThrow();
  });

  it('rejects a missing page indicated by footer numbering', () => {
    const p = page();
    p.Texts[p.Texts.length - 1] = text('Page : 1/2', 28, 59.302);
    expect(() => parse([p])).toThrow('inconsistent page numbering');
  });

  it('rejects the wrong session', () => {
    const p = page();
    p.Texts[0] = text('HORAIRE AUTOMNE 2026', 13, 4);
    expect(() => parse([p])).toThrow('does not match requested URL');
  });

  it.each([text('DST404', 0.6, 24), text('DST404', 0.551, 24, true)])(
    'detects rows skipped by exact-position or font filters',
    (row) => {
      const p = page();
      p.Texts.push(row);
      expect(() => parse([p])).toThrow('Course rows not parsed: [DST404]');
    }
  );

  it('rejects malformed course codes in the code column', () => {
    const p = page();
    p.Texts.push(text('DST4044X', 0.551, 24));
    expect(() => parse([p])).toThrow('unrecognized course row');
  });
});
