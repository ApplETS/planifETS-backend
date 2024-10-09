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
    expect(courseWithPrereq?.prerequisites).toContain('GOL301');
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
    const firstProgram: Program = programs[0]; //GOL program 7095

    const choixCourse = firstProgram.courses.find(
      (course) => course.code === 'ENT201',
    );

    expect(choixCourse).toBeDefined();
    expect(choixCourse?.type).toBe('CHOIX');
    expect(choixCourse?.session).toBe(5);
    expect(choixCourse?.code).toBe('ENT201');
    expect(choixCourse?.profile).toBe('T');
    expect(choixCourse?.concentration).toBe('TC');
    expect(choixCourse?.category).toBe('C');
    expect(choixCourse?.level).toBe('B');
    expect(choixCourse?.mandatory).toBe(false);
    expect(choixCourse?.prerequisites).toEqual([]);
    expect(choixCourse?.alternatives).toEqual(['ENT202', 'ENT601', 'ING500']);
  });

  it('should correctly parse the last program', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const lastProgram = programs[programs.length - 1];

    expect(lastProgram.code).toBe('9159');
    expect(lastProgram.courses.length).toBeGreaterThan(0);

    //FIXME: This test should be fixed to match the actual courses in the last program (need to fix this for all non-BAC programs)
    //See issue: https://github.com/orgs/ApplETS/projects/11/views/2?pane=issue&itemId=82700266
    const expectedCourses = ['GES817'];
    const parsedCourses = lastProgram.courses.map((course) => course.code);

    expectedCourses.forEach((courseCode) => {
      expect(parsedCourses).toContain(courseCode);
    });

    const horsProgrammeCourses = lastProgram.getHorsProgramme();
    expect(horsProgrammeCourses).toEqual(['ATE075,', 'ATE085,']);
  });

  it('should correctly parse courses with prerequisites', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const firstProgram = programs[0]; //GOL program 7095

    const courseWithPrerequisite = firstProgram.courses.find(
      (course) => course.code === 'MAT472',
    );
    const courseWithPrerequisite1 = firstProgram.courses.find(
      (course) => course.code === 'MAT215',
    );
    expect(courseWithPrerequisite).toBeDefined();
    expect(courseWithPrerequisite1).toBeDefined();
    expect(courseWithPrerequisite?.prerequisites).toContain('MAT145');
    expect(courseWithPrerequisite1?.prerequisites).toEqual([
      'MAT145',
      '(@ INF130)',
    ]);
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

    expect(courseWithUnstructuredPrereq?.prerequisites).toEqual(['INF130 - I']);
    expect(courseWithConditionalPrereq?.prerequisites).toEqual(['>=70']);
    expect(courseWithLowercasePrereq?.prerequisites).toEqual(['MAT350']);
  });

  it('should handle courses without prerequisites', async () => {
    await service.parseProgramsAndCoursesCheminot();

    const programs = service.getPrograms();
    const firstProgram = programs[0]; //GOL Program 7095

    const courseWithoutPrerequisites = firstProgram.courses.find(
      (course) => course.code === 'PRE011',
    );
    expect(courseWithoutPrerequisites).toBeDefined();
    expect(courseWithoutPrerequisites?.prerequisites.length).toBe(0);
  });
});
