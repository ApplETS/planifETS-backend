import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class SessionService {
  //TODO: Implement the following methods

  public session(id: number) {
    return 'This action returns a #${id} session';
  }

  public sessions() {
    return 'This action returns all session';
  }

  public createSession(createSessionDto: Prisma.SessionCreateInput) {
    return 'This action adds a new session';
  }

  public upsertSession(
    id: number,
    updateSessionDto: Prisma.SessionUpdateInput,
  ) {
    return 'This action updates a #${id} session';
  }

  public removeSession(id: number) {
    return 'This action removes a #${id} session';
  }
}
