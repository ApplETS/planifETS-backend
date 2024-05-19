import { Injectable } from '@nestjs/common';

import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

@Injectable()
export class ProgramService {
  public create(createProgramDto: CreateProgramDto) {
    return 'This action adds a new program';
  }

  public findAll() {
    return 'This action returns all program';
  }

  public findOne(id: number) {
    return `This action returns a #${id} program`;
  }

  public update(id: number, updateProgramDto: UpdateProgramDto) {
    return `This action updates a #${id} program`;
  }

  public remove(id: number) {
    return `This action removes a #${id} program`;
  }
}
