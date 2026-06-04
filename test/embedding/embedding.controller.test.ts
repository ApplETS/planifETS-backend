import { EmbeddingViewDto } from '../../src/embedding/dtos/embedding-view.dto';
import { EmbeddingController } from '../../src/embedding/embedding.controller';
import { EmbeddingService } from '../../src/embedding/embedding.service';

describe('EmbeddingController', () => {
  let controller: EmbeddingController;
  let serviceMock: {
    findAll: jest.Mock;
    findByCourseId: jest.Mock;
    countCourses: jest.Mock;
  };

  beforeEach(() => {
    serviceMock = {
      findAll: jest.fn(),
      findByCourseId: jest.fn(),
      countCourses: jest.fn(),
    };
    controller = new EmbeddingController(serviceMock as unknown as EmbeddingService);
  });

  describe('findAll', () => {
    it('delegates to EmbeddingService.findAll and returns the result', async () => {
      const rows: EmbeddingViewDto[] = [];
      serviceMock.findAll.mockResolvedValue(rows);
      await expect(controller.findAll()).resolves.toBe(rows);
      expect(serviceMock.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('countCourses', () => {
    it('delegates to EmbeddingService.countCourses and returns the count', async () => {
      serviceMock.countCourses.mockResolvedValue({ count: 10 });
      await expect(controller.countCourses()).resolves.toStrictEqual({ count: 10 });
      expect(serviceMock.countCourses).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByCourseId', () => {
    it('delegates to EmbeddingService.findByCourseId with the parsed courseId', async () => {
      const rows: EmbeddingViewDto[] = [];
      serviceMock.findByCourseId.mockResolvedValue(rows);
      await expect(controller.findByCourseId(352507)).resolves.toBe(rows);
      expect(serviceMock.findByCourseId).toHaveBeenCalledWith(352507);
    });
  });
});
