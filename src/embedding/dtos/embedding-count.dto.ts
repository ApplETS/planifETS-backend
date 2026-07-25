import { ApiProperty } from '@nestjs/swagger';

export class EmbeddingCountDto {
  @ApiProperty({ example: 42 })
  public count!: number;
}
