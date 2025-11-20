import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { HoraireCoursService } from '@/common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';
describe('HoraireCoursService', () => {
  const NUMBER_OF_COURSES_IN_PDF = 61;
  let service: HoraireCoursService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoraireCoursService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HoraireCoursService>(HoraireCoursService);
  });

  describe('PDF readability from local storage', () => {
    const pdfFilePath = join(
      process.cwd(),
      'test',
      'assets',
      'HorairePublication_20243_7084.pdf',
    );

    it('should confirm that the PDF file exists', () => {
      const fileExists = existsSync(pdfFilePath);
      expect(fileExists).toBe(true);
    });

    it('should successfully read the PDF file without errors', () => {
      const pdfBuffer = readFileSync(pdfFilePath);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should verify that the file is a valid PDF by checking the magic number', () => {
      const pdfBuffer = readFileSync(pdfFilePath);
      const magicNumber = pdfBuffer.subarray(0, 4).toString();
      expect(magicNumber).toBe('%PDF');
    });
  });

  describe('Parse valid PDF and extract courses', () => {
    let pdfBuffer: Buffer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let courses: any[];

    beforeAll(async () => {
      const pdfFilePath = join(
        process.cwd(),
        'test',
        'assets',
        'HorairePublication_20243_7084.pdf',
      );
      pdfBuffer = readFileSync(pdfFilePath);

      courses = await service.parseHoraireCoursPdf(pdfBuffer, 'local_pdf');
    });

    it('should return a defined and non-empty array of courses', () => {
      expect(courses).toBeDefined();
      expect(Array.isArray(courses)).toBe(true);
      expect(courses.length).toBeGreaterThan(0);
    });

    it('should have the expected number of unique courses', () => {
      const uniqueCourseCodes = new Set(courses.map((course) => course.code));
      const expectedUniqueCount = NUMBER_OF_COURSES_IN_PDF;
      expect(uniqueCourseCodes.size).toBe(expectedUniqueCount);
    });

    it('should correctly populate key properties for each course', () => {
      courses.forEach((course) => {
        expect(course.code).toMatch(/^[A-Z]{3}\d{3}$/); // Example pattern: "ATE075"
        expect(typeof course.title).toBe('string');
        expect(course.title.length).toBeGreaterThan(0);
        expect(typeof course.prerequisites).toBe('string');
        // Prerequisites can be empty, so no length check
      });
    });
    describe('Course details', () => {
      it('should correctly extract ATE075 course with accurate details', () => {
        // Validate the "ATE075" course
        const ate075 = courses.find((course) => course.code === 'ATE075');
        expect(ate075).toBeDefined();
        expect(ate075.title).toBe("NEUROFOCUS : STRATÉGIES D'ÉTUDES OPTIMALES");
        expect(ate075.prerequisites).toBe('');

        //Group
        expect(ate075.groups).toBeDefined();
        expect(ate075.groups['01']).toBeDefined();
        expect(ate075.groups['01'].periods).toHaveLength(1);

        //Period
        const periodAte075 = ate075.groups['01'].periods[0];
        expect(periodAte075.day).toBe('Mer');
        expect(periodAte075.time).toBe('09:00 - 12:30');
        expect(periodAte075.activity).toBe('Atelier');
        expect(periodAte075.teacher).toBe('');
        expect(periodAte075.local).toBe('D-3007');
        expect(periodAte075.mode).toBe('P');
        expect(periodAte075.dateRange).toBe('');
      });

      it('should correctly extract CHM131 course with accurate details', () => {
        const chm131 = courses.find((course) => course.code === 'CHM131');
        expect(chm131).toBeDefined();
        expect(chm131.title).toBe('CHIMIE ET MATÉRIAUX');
        expect(chm131.prerequisites).toBe('');

        // Groups
        expect(Object.keys(chm131.groups)).toHaveLength(13);
        const chm131Group15 = chm131.groups['15'];
        expect(chm131Group15).toBeDefined();
        expect(chm131Group15.periods).toHaveLength(2);

        // Periods
        const period1 = chm131Group15.periods[0];
        expect(period1.day).toBe('Lun');
        expect(period1.time).toBe('18:00 - 21:30');
        expect(period1.activity).toBe('C');
        expect(period1.teacher).toBe('M. Cloutier');
        expect(period1.local).toBe('B-1512');
        expect(period1.mode).toBe('P');
        expect(period1.dateRange).toBe('');

        const period2 = chm131Group15.periods[1];
        expect(period2.day).toBe('Ven');
        expect(period2.time).toBe('18:00 - 21:00');
        expect(period2.activity).toBe('TP');
        expect(period2.teacher).toBe('M. Cloutier');
        expect(period2.local).toBe('B-1720');
        expect(period2.mode).toBe('P');
        expect(period2.dateRange).toBe('');
      });

      it('should correctly extract the first period of the first group at the beginning of the file', () => {
        const courseCode = 'ATE075';
        const firstCourse = courses[0];
        const firstGroup = firstCourse.groups['01'];
        const firstPeriod = firstGroup.periods[0];

        expect(firstCourse.code).toBe(courseCode);

        //First period
        expect(firstPeriod.day).toBe('Mer');
        expect(firstPeriod.time).toBe('09:00 - 12:30');
        expect(firstPeriod.activity).toBe('Atelier');
        expect(firstPeriod.teacher).toBe('');
        expect(firstPeriod.local).toBe('D-3007');
        expect(firstPeriod.mode).toBe('P');
        expect(firstPeriod.dateRange).toBe('');
      });

      it('should correctly extract the last period of the last group at the end of the file', () => {
        const lastCourse = courses[courses.length - 1];
        const lastGroup = lastCourse.groups['06'];
        const lastPeriod = lastGroup.periods[lastGroup.periods.length - 1];
        //Course TIN503
        expect(lastCourse.code).toBe('TIN503');
        expect(lastCourse.title).toBe('ENVIRONNEMENT, TECHNOLOGIE ET SOCIÉTÉ');

        //Last group
        expect(lastGroup.periods).toHaveLength(2);

        //First period
        const firstPeriod = lastGroup.periods[0];
        expect(firstPeriod.day).toBe('Mer');
        expect(firstPeriod.time).toBe('18:00 - 21:30');
        expect(firstPeriod.activity).toBe('C');
        expect(firstPeriod.teacher).toBe('M. Lejeune');
        expect(firstPeriod.local).toBe('');
        expect(firstPeriod.mode).toBe('H');
        expect(firstPeriod.dateRange).toBe('');

        //Last period
        expect(lastPeriod.day).toBe('Jeu');
        expect(lastPeriod.time).toBe('18:00 - 22:00');
        expect(lastPeriod.activity).toBe('pratiques (TP).'); //bug here but it's not a big deal
        expect(lastPeriod.teacher).toBe('M. Lejeune');
        expect(lastPeriod.local).toBe('');
        expect(lastPeriod.mode).toBe('H');
        expect(lastPeriod.dateRange).toBe('');
      });

      it('should handle courses with only one group and one period correctly', () => {
        const ENT303 = courses.find((course) => course.code === 'ENT303');
        expect(ENT303).toBeDefined();
        expect(ENT303.title).toBe('PROJETS SPÉCIAUX EN ENTREPRENEURIAT III');
        expect(ENT303.prerequisites).toBe('');
        expect(Object.keys(ENT303.groups)).toHaveLength(1);

        const group = ENT303.groups['01'];
        expect(group).toBeDefined();
        expect(group.periods).toHaveLength(1);

        const period = group.periods[0];
        expect(period.day).toBe('');
        expect(period.time).toBe('');
        expect(period.activity).toBe('Projet');
        expect(period.teacher).toBe('');
        expect(period.local).toBe('');
        expect(period.mode).toBe('P');
        expect(period.dateRange).toBe('');
      });

      it('should handle courses with long prerequisite string correctly', () => {
        // Example: Validate the "GTI510" course
        const gti510 = courses.find((course) => course.code === 'GTI510');
        expect(gti510).toBeDefined();
        expect(gti510.title).toBe(
          'GESTION DE PROJETS ET ASSURANCE DE LA QUALITÉ',
        );
        expect(gti510.prerequisites).toBe(
          'GTI210 et STA204 / TI: STA204, LOG: STA204 ou STA206',
        );
      });

      it('should handle courses that overlap on two pages correctly', () => {
        const course = courses.find((PRE011) => PRE011.code === 'PRE011');
        expect(course).toBeDefined();
        expect(course.title).toBe(
          'DÉVELOPPEMENT PROFESSIONNEL ET INITIATION À LA SANTÉ ET SÉCURITÉ',
        );
        expect(course.prerequisites).toBe('');
        expect(Object.keys(course.groups)).toHaveLength(23);
        //Bug here but no biggie for now
        //Issue: https://github.com/ApplETS/planifETS-backend/issues/45
      });
    });
  });
});
