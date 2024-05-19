import { Injectable } from '@nestjs/common';

import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionService {
  public create(createSessionDto: CreateSessionDto) {
    return 'This action adds a new session';
  }

  public findAll() {
    return 'This action returns all session';
  }

  public findOne(id: number) {
    return 'This action returns a #${id} session';
  }

  public update(id: number, updateSessionDto: UpdateSessionDto) {
    return 'This action updates a #${id} session';
  }

  public remove(id: number) {
    return 'This action removes a #${id} session';
  }
}
