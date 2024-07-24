import { Test, TestingModule } from '@nestjs/testing';

import { CoursePrerequisiteController } from '../../src/course-prerequisite/course-prerequisite.controller';
import { CoursePrerequisiteService } from '../../src/course-prerequisite/course-prerequisite.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CoursePrerequisiteController', () => {
  let controller: CoursePrerequisiteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursePrerequisiteController],
      providers: [
        CoursePrerequisiteService,
        {
          provide: PrismaService,
          useValue: {
            coursePrerequisite: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<CoursePrerequisiteController>(
      CoursePrerequisiteController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
