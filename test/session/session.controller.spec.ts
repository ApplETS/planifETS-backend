import { Test, TestingModule } from '@nestjs/testing';

import { SessionController } from '../../src/session/session.controller';
import { SessionService } from '../../src/session/session.service';

describe('SessionController', () => {
  let controller: SessionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [SessionService],
    }).compile();

    controller = module.get<SessionController>(SessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
