import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ProgramController } from '../../src/program/program.controller';
import { ProgramService } from '../../src/program/program.service';

describe('ProgramController', () => {
  let app: INestApplication;
  const programService = {
    getProgram: jest.fn(),
    getAllActivePrograms: jest.fn(),
    getProgramsListByCourseId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramController],
      providers: [
        {
          provide: ProgramService,
          useValue: programService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) {
      await app.close();
    }
  });

  it('validates the :id param before calling the program service', async () => {
    const { status, body } = await request(app.getHttpServer()).get(
      '/programs/not-a-number',
    );

    expect(status).toBe(400);
    expect(body).toStrictEqual({
      message: ['id must be an integer number'],
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('calls getProgram with the transformed numeric id', async () => {
    programService.getProgram.mockImplementation(async ({ id }) => ({
      normalizedId: id,
    }));

    const { status, body } = await request(app.getHttpServer()).get(
      '/programs/7084',
    );

    expect(status).toBe(200);
    expect(body).toStrictEqual({
      normalizedId: 7084,
    });
  });

  it('routes GET /programs to getAllActivePrograms', async () => {
    programService.getAllActivePrograms.mockResolvedValue([
      {
        id: 7084,
        code: '7084',
      },
    ]);

    const { status, body } = await request(app.getHttpServer()).get(
      '/programs',
    );

    expect(status).toBe(200);
    expect(body).toEqual([
      {
        id: 7084,
        code: '7084',
      },
    ]);
  });

  it('returns a bad request when /programs/list/course/:courseId is not numeric', async () => {
    const { status, body } = await request(app.getHttpServer()).get(
      '/programs/list/course/not-a-number',
    );

    expect(status).toBe(400);
    expect(body).toStrictEqual({
      statusCode: 400,
      message: 'Course ID must be a valid number',
    });
  });

  it('routes GET /programs/list/course/:courseId to getProgramsListByCourseId', async () => {
    programService.getProgramsListByCourseId.mockImplementation(async (id) => [
      {
        programId: id,
        programCode: '7084',
        programTitle: 'Baccalaureat en genie logiciel',
      },
    ]);

    const { status, body } = await request(app.getHttpServer()).get(
      '/programs/list/course/352405',
    );

    expect(status).toBe(200);
    expect(body).toStrictEqual([
      {
        programId: 352405,
        programCode: '7084',
        programTitle: 'Baccalaureat en genie logiciel',
      },
    ]);
  });
});
