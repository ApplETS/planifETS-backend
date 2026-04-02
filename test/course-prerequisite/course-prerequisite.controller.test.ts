import { Test, TestingModule } from '@nestjs/testing';

import { PrerequisiteController } from '../../src/prerequisite/prerequisite.controller';
import { PrerequisiteService } from '../../src/prerequisite/prerequisite.service';

describe('CoursePrerequisiteController', () => {
  let controller: PrerequisiteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrerequisiteController],
      providers: [
        {
          provide: PrerequisiteService,
          useValue: {
            getAllCoursePrerequisites: jest.fn(),
            getPrerequisitesByCode: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PrerequisiteController>(PrerequisiteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
