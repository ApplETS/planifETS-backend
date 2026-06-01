import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmbeddingViewDto {
  @ApiProperty({ example: '352507_182848' })
  public embedding_id!: string;

  @ApiProperty({ example: 352507 })
  public course_id!: number;

  @ApiProperty({ example: 182848 })
  public program_id!: number;

  @ApiProperty({ example: 'LOG635' })
  public code!: string;

  @ApiProperty({ example: 'Systèmes intelligents et algorithmes' })
  public title!: string;

  @ApiProperty({ example: 'Ce cours vise la compréhension…' })
  public description!: string;

  @ApiPropertyOptional({ example: 1 })
  public cycle!: number | null;

  @ApiProperty({ example: 'Baccalauréat en génie logiciel' })
  public program_title!: string;

  @ApiPropertyOptional({ example: 'TRONC' })
  public type!: string | null;

  @ApiPropertyOptional({ example: 5 })
  public typical_session_index!: number | null;

  @ApiPropertyOptional({ example: 'Autorisation du directeur' })
  public unstructured_prerequisite!: string | null;

  @ApiProperty({ type: [String], example: ['LOG320', 'MAT350'] })
  public prerequisite_codes!: string[];

  @ApiProperty({ example: true })
  public has_prerequisites!: boolean;

  @ApiProperty({ type: [String], example: ['JOUR', 'SOIR'] })
  public availability!: string[];

  @ApiProperty({ type: [String], example: ['Automne 2026', 'Hiver 2027'] })
  public sessions!: string[];
}
