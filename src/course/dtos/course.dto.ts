import { ApiProperty } from '@nestjs/swagger';
import { Course } from "@prisma/client";

export class CourseDto implements Course {
  @ApiProperty({ example: 352405, description: 'Course ID' })
  public id!: number;

  @ApiProperty({ example: 'LOG121', description: 'Course code' })
  public code!: string;

  @ApiProperty({ example: 'Conception orientée objet', description: 'Course title' })
  public title!: string;

  @ApiProperty({ example: 'Introduction aux concepts de la programmation orientée objet...', description: 'Course description' })
  public description!: string;

  @ApiProperty({ example: 3, nullable: true, description: 'Number of credits' })
  public credits!: number | null;

  @ApiProperty({ example: 1, nullable: true, description: 'Academic cycle (1 for bachelor, 2 for master, etc.)' })
  public cycle!: number | null;

  @ApiProperty()
  public createdAt!: Date;

  @ApiProperty()
  public updatedAt!: Date;
}
