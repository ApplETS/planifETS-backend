import { Test, TestingModule } from '@nestjs/testing';

import { CourseInstanceService } from '../../src/course-instance/course-instance.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CourseInstanceService (integration)', () => {
  let service: CourseInstanceService;
  let prisma: PrismaService;


  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseInstanceService, PrismaService],
    }).compile();
    service = module.get<CourseInstanceService>(CourseInstanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should fetch a course instance by unique input', async () => {
    const session = await prisma.session.create({ data: { year: 2040, trimester: 'HIVER' } });
    const course = await prisma.course.create({
      data: { id: 1101, code: 'TEST101A', title: 'Test Course A', credits: 3, description: '', cycle: 1 },
    });
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
      },
    });
    expect(found).not.toBeNull();
    expect(found?.courseId).toBe(courseInstance.courseId);
  });
});
