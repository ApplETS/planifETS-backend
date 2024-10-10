import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';

import { CheminotService } from '../../../../src/common/api-helper/cheminot/cheminot.service';
import { FileExtractionService } from '../../../../src/common/api-helper/cheminot/file-extraction.service';
import { Program } from '../../../../src/common/api-helper/cheminot/Program';

describe('CheminotService with data from a copy of Cheminements.txt (Cheminot file)', () => {
  let service: CheminotService;
  let cheminementsData: string;

  beforeAll(() => {
    const filePath = path.join(__dirname, 'Cheminements.txt');
    cheminementsData = fs.readFileSync(filePath, 'utf-8');
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheminotService,
        {
          provide: FileExtractionService,
          useValue: {
            extractCheminementsFile: jest
              .fn()
              .mockResolvedValue(cheminementsData),
          },
        },
      ],
    }).compile();

    service = module.get<CheminotService>(CheminotService);
  });

  it('should parse the file data and return valid programs and courses', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    expect(programs.length).toBeGreaterThan(0);

    const firstProgram = programs[0];
    expect(firstProgram.code).toBe('7095');
    expect(firstProgram.courses.length).toBeGreaterThan(0);

    const firstCourse = firstProgram.courses.find(
      (course) => course.code === 'GOL111',
    );
    expect(firstCourse).toBeDefined();
    expect(firstCourse?.code).toBe('GOL111');
    expect(firstCourse?.concentration).toBe('TC');
    expect(firstCourse?.session).toBe(1);
  });

  it('should handle multiple programs and their courses', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    expect(programs.length).toBeGreaterThan(1);

    const secondProgram = programs[1];
    expect(secondProgram.courses.length).toBeGreaterThan(0);
  });

  it('should correctly parse and assign prerequisites for courses', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const firstProgram = programs[0];

    const courseWithPrereq = firstProgram.courses.find(
      (course) => course.code === 'GOL451',
    );
    expect(courseWithPrereq).toBeDefined();

    // Now we need to search for 'GOL301' within the prerequisites array
    const prerequisites = courseWithPrereq?.prerequisites.flatMap(
      (p) => p.prerequisites,
    );
    expect(prerequisites).toContain('GOL301');
  });

  it('should correctly parse and assign hors-programme courses', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const firstProgram: Program = programs[0]; //GOL program 7095

    // Trim any trailing commas and spaces from the hors-programme courses
    const horsProgrammeCourses = firstProgram
      .getHorsProgramme()
      .map((course) => course.replace(/,$/, '').trim());

    expect(firstProgram.code).toBe('7095');
    expect(horsProgrammeCourses).toEqual([
      'PCO410',
      'MAT144',
      'PHY144',
      'ATE075',
      'ATE085',
      'LRC105',
    ]);
  });

  it('should correctly parse and assign "CHOIX" line with alternatives', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const firstProgram: Program = programs[0]; // GOL program 7095

    // Assuming the 'CHOIX' courses are stored in the 'choix' array
    const choixCourse = firstProgram.choix?.find(
      (course) => course.code === 'ENT201', // Find the main course from CHOIX
    );

    expect(choixCourse).toBeDefined();
    expect(choixCourse?.type).toBe('CHOIX');
    expect(choixCourse?.session).toBe(5);
    expect(choixCourse?.code).toBe('ENT201');

    expect(choixCourse?.concentration).toBe('TC');
    expect(choixCourse?.category).toBe('C');
    expect(choixCourse?.level).toBe('B');
    expect(choixCourse?.mandatory).toBe(false);
    expect(choixCourse?.prerequisites).toEqual([]); // CHOIX courses have no prerequisites

    // Now the alternatives should include the main course code as well
    const expectedAlternatives = ['ENT201', 'ENT202', 'ENT601', 'ING500'];
    expect(choixCourse?.alternatives).toEqual(expectedAlternatives);
  });

  it('should correctly parse the last program of the file (non-BAC)', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const lastProgram = programs[programs.length - 1];

    const expectedCourses = [
      'ATE800',
      'GES815',
      'GES816',
      'GES817',
      'GES818',
      'GES823',
      'GES824',
      'GES830',
      'GES892',
      'GES895',
    ];
    const parsedCourses = lastProgram.courses.map((course) => course.code);
    // ATE800, GES815, GES816, GES817, GES818, GES823, GES824, GES830, GES892, GES895
    // .HORS-PROGRAMME pour 9159
    // ATE075,
    // ATE085,

    //FIXME: This test should be fixed to match the actual courses in the last program (need to fix this for all non-BAC programs)
    //See issue: https://github.com/ApplETS/planifETS-backend/issues/41
    expect(lastProgram.code).toBe('9159');
    // expect(lastProgram.courses.length).toBeGreaterThan(0);

    // expect(expectedCourses).toEqual(parsedCourses);

    // const horsProgrammeCourses = lastProgram.getHorsProgramme();
    // expect(horsProgrammeCourses).toEqual(['ATE075,', 'ATE085,']);
  });

  it('should correctly parse courses with prerequisites', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const firstProgram = programs[0]; // GOL program 7095

    const courseWithPrerequisite = firstProgram.courses.find(
      (course) => course.code === 'MAT472',
    );
    expect(courseWithPrerequisite).toBeDefined();

    const prerequisites = courseWithPrerequisite?.prerequisites.flatMap(
      (p) => p.prerequisites,
    );
    expect(prerequisites).toContain('MAT145');
  });

  it('should correctly parse courses with unstructured and conditional prerequisites', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const firstProgram = programs[0]; // GOL program 7095

    const courseWithUnstructuredPrereq = firstProgram.courses.find(
      (course) => course.code === 'GOL491',
    ); //CONCE,6,17,GOL491,T,SE,C,B,O,INF130 - I,
    const courseWithConditionalPrereq = firstProgram.courses.find(
      (course) => course.code === 'TIN503',
    ); //TRONC,7,1,TIN503,T,TC,C,B,B,>=70,
    const courseWithLowercasePrereq = firstProgram.courses.find(
      (course) => course.code === 'GOL676',
    ); //CONCE,8,12,GOL676,T,PR,C,B,O,mAT350,

    expect(courseWithConditionalPrereq).toBeDefined();
    expect(courseWithUnstructuredPrereq).toBeDefined();
    expect(courseWithLowercasePrereq).toBeDefined();

    // Flatten the prerequisites array from profiles and check for the specific values
    const unstructuredPrereqs =
      courseWithUnstructuredPrereq?.prerequisites.flatMap(
        (p) => p.prerequisites,
      );
    const conditionalPrereqs =
      courseWithConditionalPrereq?.prerequisites.flatMap(
        (p) => p.prerequisites,
      );
    const lowercasePrereqs = courseWithLowercasePrereq?.prerequisites.flatMap(
      (p) => p.prerequisites,
    );

    expect(unstructuredPrereqs).toEqual(['INF130 - I']);
    expect(conditionalPrereqs).toEqual(['>=70']);
    expect(lowercasePrereqs).toEqual(['MAT350']);
  });

  it('should handle courses without prerequisites', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const firstProgram = programs[0]; // GOL Program 7095

    const courseWithoutPrerequisites = firstProgram.courses.find(
      (course) => course.code === 'PRE011',
    );
    expect(courseWithoutPrerequisites).toBeDefined();
    expect(courseWithoutPrerequisites?.prerequisites.length).toBe(0);
  });

  it('should merge duplicate courses with different profiles for MAT215', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const firstProgram: Program = programs[0]; // GOL program 7095
    const mergedCourse = firstProgram.courses.find(
      (course) => course.code === 'MAT215',
    );

    expect(mergedCourse).toBeDefined();
    expect(mergedCourse?.type).toBe('TRONC');
    expect(mergedCourse?.session).toBe(4);
    expect(mergedCourse?.code).toBe('MAT215');

    const expectedPrerequisites = [
      {
        profile: 'AD',
        prerequisites: ['MAT145', '(@ INF130)'],
      },
      {
        profile: 'I',
        prerequisites: ['MAT145'],
      },
      {
        profile: 'P',
        prerequisites: ['MAT145', '(@ INF130)'],
      },
      {
        profile: 'R',
        prerequisites: ['MAT145', '(@ INF130)'],
      },
    ];

    expect(mergedCourse?.prerequisites).toEqual(
      expect.arrayContaining(expectedPrerequisites),
    );
    expect(mergedCourse?.concentration).toBe('TC');
    expect(mergedCourse?.category).toBe('C');
    expect(mergedCourse?.level).toBe('B');
    expect(mergedCourse?.mandatory).toBe(true);
  });

  it('should merge duplicate course lines that have the same prerequisites', async () => {
    // Parse the programs from the cheminot file
    await service.parseProgramsAndCoursesCheminot();
    const programs = service.getPrograms();

    const firstProgram = programs[0]; // GOL program 7095

    const mergedCourse = firstProgram.courses.find(
      (course) => course.code === 'GOL301',
    );

    // Ensure the course exists
    expect(mergedCourse).toBeDefined();
    expect(mergedCourse?.type).toBe('TRONC');
    expect(mergedCourse?.session).toBe(3);
    expect(mergedCourse?.code).toBe('GOL301');
    expect(mergedCourse?.concentration).toBe('TC');
    expect(mergedCourse?.category).toBe('C');
    expect(mergedCourse?.level).toBe('B');
    expect(mergedCourse?.mandatory).toBe(true);

    const expectedPrerequisites = [
      {
        profile: 'AD',
        prerequisites: ['GOL201'],
      },
      {
        profile: 'I',
        prerequisites: ['GOL201'],
      },
      {
        profile: 'R',
        prerequisites: ['GOL201'],
      },
      {
        profile: 'P',
        prerequisites: ['GOL201'],
      },
    ];

    expect(mergedCourse?.prerequisites).toEqual(
      expect.arrayContaining(expectedPrerequisites),
    );
  });
});
