import { ApiProperty } from '@nestjs/swagger';
import { Program } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

export class ProgramDto implements Program {
  @ApiProperty()
  public id!: number;

  @ApiProperty({ nullable: true })
  public code!: string | null;

  @ApiProperty()
  public title!: string;

  @ApiProperty({ nullable: true })
  public credits!: string | null;

  @ApiProperty()
  public cycle!: number;

  @ApiProperty()
  public url!: string;

  @ApiProperty()
  public isHorairePdfParsable!: boolean;

  @ApiProperty()
  public isPlanificationPdfParsable!: boolean;

  @ApiProperty({ type: 'object', nullable: true })
  public horaireCoursPdfJson!: JsonValue;

  @ApiProperty({ type: 'object', nullable: true })
  public planificationPdfJson!: JsonValue;

  @ApiProperty()
  public createdAt!: Date;

  @ApiProperty()
  public updatedAt!: Date;
}
