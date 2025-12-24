import { Test, TestingModule } from '@nestjs/testing';
import { Session, Trimester } from '@prisma/client';

import { SessionController } from '../../src/session/session.controller';
import { SessionService } from '../../src/session/session.service';

describe('SessionController', () => {
  let controller: SessionController;
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: {
            getAllSessions: jest.fn(),
            getLatestAvailableSession: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SessionController>(SessionController);
    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllSessions', () => {
    it('should return all sessions', async () => {
      const sessions: Session[] = [
        {
          year: 2023,
          trimester: Trimester.HIVER,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (service.getAllSessions as jest.Mock).mockResolvedValue(sessions);
      const result = await controller.getAllSessions();
      expect(result).toEqual(sessions);
      expect(service.getAllSessions).toHaveBeenCalled();
    });

    it('should return null if no sessions', async () => {
      (service.getAllSessions as jest.Mock).mockResolvedValue(null);
      const result = await controller.getAllSessions();
      expect(result).toBeNull();
    });
  });

  describe('getLatestAvailableSession', () => {
    it('should return the latest available session', async () => {
      const session: Session = {
        year: 2024,
        trimester: Trimester.AUTOMNE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (service.getLatestAvailableSession as jest.Mock).mockResolvedValue(session);
      const result = await controller.getLatestAvailableSession();
      expect(result).toEqual(session);
      expect(service.getLatestAvailableSession).toHaveBeenCalled();
    });

    it('should return null if no session is available', async () => {
      (service.getLatestAvailableSession as jest.Mock).mockResolvedValue(null);
      const result = await controller.getLatestAvailableSession();
      expect(result).toBeNull();
    });
  });
});
