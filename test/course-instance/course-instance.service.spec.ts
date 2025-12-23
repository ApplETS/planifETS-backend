

import { Test, TestingModule } from '@nestjs/testing';
import { Availability, PrismaClient } from '@prisma/client';

import { CourseInstanceService } from '../../src/course-instance/course-instance.service';
import { PrismaService } from '../../src/prisma/prisma.service';

// Use the real PrismaClient for integration tests
const prisma = new PrismaClient();


describe('CourseInstanceService (integration)', () => {
  let service: CourseInstanceService;


  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseInstanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CourseInstanceService>(CourseInstanceService);
  });

  beforeEach(async () => {
    await prisma.courseInstance.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.programCoursePrerequisite?.deleteMany?.({});
    await prisma.programCourse?.deleteMany?.({});
    await prisma.course.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.courseInstance.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.course.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch a course instance by unique input', async () => {
    const course = await prisma.course.create({ data: { id: 1001, code: 'TEST101', title: 'Test Course', credits: 3, description: '', cycle: 1 } });
    const session = await prisma.session.create({ data: { year: 2024, trimester: 'HIVER' } });
    const courseInstance = await prisma.courseInstance.create({
      data: {
        courseId: course.id,
        sessionYear: session.year,
        sessionTrimester: session.trimester,
        availability: ['JOUR'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const found = await service.getCourseInstance({
      courseId_sessionYear_sessionTrimester: {
        courseId: course.id,
        sessionYear: session.year,
        sessionTrimester: session.trimester,
      }
    });

    expect(found).not.toBeNull();
    expect(found?.courseId).toBe(courseInstance.courseId);
    expect(found?.sessionYear).toBe(courseInstance.sessionYear);
    expect(found?.sessionTrimester).toBe(courseInstance.sessionTrimester);
    // Cleanup
    await prisma.courseInstance.delete({ where: { courseId_sessionYear_sessionTrimester: { courseId: course.id, sessionYear: session.year, sessionTrimester: session.trimester } } });
    await prisma.session.delete({ where: { year_trimester: { year: session.year, trimester: session.trimester } } });
    await prisma.course.delete({ where: { id: course.id } });
  });

  it('should fetch course instances by sessions', async () => {
    // Setup test data
    const course = await prisma.course.create({ data: { id: 1002, code: 'TEST102', title: 'Test Course 2', credits: 3, description: '', cycle: 1 } });
    const session1 = await prisma.session.create({ data: { year: 2024, trimester: 'HIVER' } });
    const session2 = await prisma.session.create({ data: { year: 2025, trimester: 'ETE' } });
    await prisma.courseInstance.create({
      data: {
        courseId: course.id,
        sessionYear: session1.year,
        sessionTrimester: session1.trimester,
        availability: ['JOUR'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await prisma.courseInstance.create({
      data: {
        courseId: course.id,
        sessionYear: session2.year,
        sessionTrimester: session2.trimester,
        availability: ['SOIR'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const found = await service.getCourseInstancesBySessions([session1, session2]);

    expect(found.length).toBeGreaterThanOrEqual(2);
  });

  it('should fetch all course instances', async () => {
    const all = await service.getAllCourseInstances();
    expect(Array.isArray(all)).toBe(true);
  });

  it('should fetch course availability', async () => {
    const course = await prisma.course.create({ data: { id: 1003, code: 'TEST103', title: 'Test Course 3', credits: 3, description: '', cycle: 1 } });
    const session = await prisma.session.create({ data: { year: 2026, trimester: 'AUTOMNE' } });
    await prisma.courseInstance.create({
      data: {
        courseId: course.id,
        sessionYear: session.year,
        sessionTrimester: session.trimester,
        availability: ['JOUR'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const found = await service.getCourseAvailability(course.id);

    expect(found.some(f => f.session.year === session.year && f.session.trimester === session.trimester)).toBe(true);
  });

  it('should fetch course instances by course', async () => {
    const course = await prisma.course.create({ data: { id: 1004, code: 'TEST104', title: 'Test Course 4', credits: 3, description: '', cycle: 1 } });
    const session = await prisma.session.create({ data: { year: 2027, trimester: 'ETE' } });
    const ci = await prisma.courseInstance.create({
      data: {
        courseId: course.id,
        sessionYear: session.year,
        sessionTrimester: session.trimester,
        availability: ['JOUR'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const found = await service.getCourseInstancesByCourse(course.id);
    expect(found.some(f => f.courseId === ci.courseId && f.sessionYear === ci.sessionYear && f.sessionTrimester === ci.sessionTrimester)).toBe(true);
  });

  it('should create a course instance', async () => {
    const course = await prisma.course.create({ data: { id: 1005, code: 'TEST105', title: 'Test Course 5', credits: 3, description: '', cycle: 1 } });
    const session = await prisma.session.create({ data: { year: 2028, trimester: 'HIVER' } });
    const availability: Availability[] = ['JOUR'];
    const created = await service.createCourseInstance(course, session, availability);
    expect(created).toBeDefined();
    expect(created.courseId).toBe(course.id);
  });

  it('should update course instance availability', async () => {
    const course = await prisma.course.create({ data: { id: 1006, code: 'TEST106', title: 'Test Course 6', credits: 3, description: '', cycle: 1 } });
    const session = await prisma.session.create({ data: { year: 2029, trimester: 'ETE' } });
    const ci = await prisma.courseInstance.create({
      data: {
        courseId: course.id,
        sessionYear: session.year,
        sessionTrimester: session.trimester,
        availability: ['JOUR'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const availability: Availability[] = ['SOIR'];
    await service.updateCourseInstanceAvailability(ci, availability);
    const updated = await prisma.courseInstance.findUnique({ where: { courseId_sessionYear_sessionTrimester: { courseId: course.id, sessionYear: session.year, sessionTrimester: session.trimester } } });
    expect(updated?.availability).toContain('SOIR');
  });

  it('should delete a course instance', async () => {
    const course = await prisma.course.create({ data: { id: 1007, code: 'TEST107', title: 'Test Course 7', credits: 3, description: '', cycle: 1 } });
    const session = await prisma.session.create({ data: { year: 2030, trimester: 'HIVER' } });
    const ci = await prisma.courseInstance.create({
      data: {
        courseId: course.id,
        sessionYear: session.year,
        sessionTrimester: session.trimester,
        availability: ['JOUR'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const deleted = await service.deleteCourseInstance(course.id, session.year, session.trimester);
    expect(deleted.courseId).toBe(ci.courseId);
    expect(deleted.sessionYear).toBe(ci.sessionYear);
    expect(deleted.sessionTrimester).toBe(ci.sessionTrimester);
  });
});
