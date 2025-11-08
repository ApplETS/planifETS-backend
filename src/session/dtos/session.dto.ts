import { ApiProperty } from '@nestjs/swagger';
import { $Enums, Session } from '@prisma/client';

export class SessionDto implements Session {
  @ApiProperty({
    enum: ['AUTOMNE', 'ETE', 'HIVER'],
  })
  public trimester!: $Enums.Trimester;

  @ApiProperty()
  public year!: number;

  @ApiProperty()
  public createdAt!: Date;

  @ApiProperty()
  public updatedAt!: Date;
}