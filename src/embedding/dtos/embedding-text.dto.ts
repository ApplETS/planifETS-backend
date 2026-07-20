import { ApiProperty } from '@nestjs/swagger';

export class EmbeddingTextDto {
  @ApiProperty({ example: '352507_182848' })
  public embedding_id!: string;

  @ApiProperty({
    example:
      "LOG680 Introduction à l'approche DevOps. cours optionnel. L'approche DevOps vise à intégrer les différents aspects liés au cycle de vie des systèmes logiciels…"
  })
  public text!: string;
}
