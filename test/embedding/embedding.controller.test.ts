import { EmbeddingViewDto } from '../../src/embedding/dtos/embedding-view.dto';
import { EmbeddingController } from '../../src/embedding/embedding.controller';
import { EmbeddingService } from '../../src/embedding/embedding.service';

describe('EmbeddingController', () => {
  let controller: EmbeddingController;
  let serviceMock: {
    findAll: jest.Mock;
    findAllTexts: jest.Mock;
    findByCourseId: jest.Mock;
    countCourses: jest.Mock;
  };

  beforeEach(() => {
    serviceMock = {
      findAll: jest.fn(),
      findAllTexts: jest.fn(),
      findByCourseId: jest.fn(),
      countCourses: jest.fn()
    };
    controller = new EmbeddingController(
      serviceMock as unknown as EmbeddingService
    );
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
      await expect(controller.countCourses()).resolves.toStrictEqual({
        count: 10
      });
      expect(serviceMock.countCourses).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllTexts', () => {
    it('delegates to EmbeddingService.findAllTexts and returns the result', async () => {
      const texts = [{ embedding_id: '352539_182848', text: 'LOG680 …' }];
      serviceMock.findAllTexts.mockResolvedValue(texts);
      await expect(controller.findAllTexts()).resolves.toBe(texts);
      expect(serviceMock.findAllTexts).toHaveBeenCalledTimes(1);
    });

    // Otherwise Nest routes "text" into :courseId and ParseIntPipe 400s.
    it('is declared before the :courseId route', () => {
      const routes = Object.getOwnPropertyNames(EmbeddingController.prototype);
      expect(routes.indexOf('findAllTexts')).toBeLessThan(
        routes.indexOf('findByCourseId')
      );
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
