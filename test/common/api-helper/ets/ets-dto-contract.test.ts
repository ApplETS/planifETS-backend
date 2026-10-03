import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CourseByIdEtsApiDto } from '@/common/api-helper/ets/course/dtos/course-by-id-ets-api.dto';
import { CourseEtsApiDto } from '@/common/api-helper/ets/course/dtos/course-ets-api.dto';
import { CourseIndexResponseDto } from '@/common/api-helper/ets/course/dtos/course-index-response.dto';
import { ProgramEtsApiDto } from '@/common/api-helper/ets/program/dtos/program-ets-api.dto';
import { ProgramIndexResponseDto } from '@/common/api-helper/ets/program/dtos/program-index-response.dto';

describe('ETS DTO contract validation', () => {
  const course = {
    id: 407641,
    title: 'Academic Integrity : Concepts and Techniques',
    description: '',
    url: 'https://www.etsmtl.ca/etudes/cours/ate800e',
    code3: 'ATE',
    code: 'ATE800E',
    cycle: '2e cycle'
  };
  const details = {
    id: course.id,
    title: course.title,
    code: course.code,
    credits: 0
  };
  const program = {
    id: 1,
    title: 'Program',
    cycle: '1er cycle',
    code: '7084',
    credits: '120',
    types: [2],
    url: 'https://www.etsmtl.ca/programmes-formations/baccalaureat-genie-logiciel'
  };
  const contracts: [
    string,
    ClassConstructor<object>,
    Record<string, unknown>
  ][] = [
    ['course', CourseEtsApiDto, course],
    ['course details', CourseByIdEtsApiDto, details],
    ['program', ProgramEtsApiDto, program],
    [
      'course index',
      CourseIndexResponseDto,
      { codes: ['ATE'], cycles: ['2e cycle'], results: [course] }
    ],
    [
      'program index',
      ProgramIndexResponseDto,
      { types: [{ id: 2, title: 'Baccalauréat' }], results: [program] }
    ]
  ];

  it.each(contracts)(
    'accepts a valid %s contract and additional upstream fields',
    (_name, dto, payload) => {
      expect(
        validateSync(
          plainToInstance(dto, { ...payload, newUpstreamField: true })
        )
      ).toEqual([]);
    }
  );

  it.each(contracts)(
    'detects every missing field in the %s contract',
    (_name, dto, payload) => {
      Object.keys(payload).forEach((field) => {
        const changed = { ...payload };
        delete changed[field];
        expect(validateSync(plainToInstance(dto, changed))).toEqual(
          expect.arrayContaining([expect.objectContaining({ property: field })])
        );
      });
    }
  );

  it.each([
    [CourseEtsApiDto, { ...course, cycle: null }],
    [CourseByIdEtsApiDto, { ...details, credits: null }],
    [ProgramEtsApiDto, { ...program, code: null, credits: null }]
  ] as [ClassConstructor<object>, object][])(
    'accepts explicitly nullable fields in %p',
    (dto, payload) => {
      expect(validateSync(plainToInstance(dto, payload))).toEqual([]);
    }
  );

  it('rejects nested course field type changes without coercion', () => {
    const payload = plainToInstance(CourseIndexResponseDto, {
      codes: ['ATE'],
      cycles: ['2e cycle'],
      results: [{ ...course, id: '407641' }]
    });
    expect(validateSync(payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'results',
          children: expect.arrayContaining([
            expect.objectContaining({
              property: '0',
              children: expect.arrayContaining([
                expect.objectContaining({ property: 'id' })
              ])
            })
          ])
        })
      ])
    );
  });

  it('rejects nested program-type drift', () => {
    const payload = plainToInstance(ProgramIndexResponseDto, {
      types: [{ id: '2', title: 'Baccalauréat' }],
      results: [program]
    });
    expect(validateSync(payload).map((error) => error.property)).toContain(
      'types'
    );
  });

  it('rejects invalid credits instead of normalizing away drift', () => {
    expect(
      validateSync(
        plainToInstance(CourseByIdEtsApiDto, { ...details, credits: '0' })
      )
    ).not.toEqual([]);
    expect(
      validateSync(
        plainToInstance(ProgramEtsApiDto, { ...program, credits: {} })
      )
    ).not.toEqual([]);
  });
});
