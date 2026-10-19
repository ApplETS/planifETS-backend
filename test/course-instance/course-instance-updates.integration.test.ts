import { Availability, PrismaClient, Session, Trimester } from '@prisma/client';

import {
  CourseInstanceService,
  CourseInstanceUpdateInput
} from '../../src/course-instance/course-instance.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('PDF course-instance updates (Postgres)', () => {
  const db = new PrismaClient();
  const service = new CourseInstanceService(db as PrismaService);
  const ids = [910001, 910002];
  let safe = false;
  let winter: Session;
  const update = (
    offerings: { courseId: number; availability: Availability[] }[],
    session = winter
  ): CourseInstanceUpdateInput => ({
    session,
    offerings
  });
  const get = (courseId = ids[0]) =>
    db.courseInstance.findUnique({
      where: {
        courseId_sessionYear_sessionTrimester: {
          courseId,
          sessionYear: winter.year,
          sessionTrimester: winter.trimester
        }
      }
    });

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (url.pathname !== '/planifetsDB_test')
      throw new Error('Requires planifetsDB_test.');
    safe = true;
    winter = await db.session.upsert({
      where: { year_trimester: { year: 2047, trimester: Trimester.HIVER } },
      create: { year: 2047, trimester: Trimester.HIVER },
      update: {}
    });
    await db.course.createMany({
      data: ids.map((id, i) => ({
        id,
        code: `TST${i + 100}`,
        title: 'Source test',
        description: ''
      })),
      skipDuplicates: true
    });
  });
  beforeEach(async () => {
    await db.courseInstance.deleteMany({ where: { courseId: { in: ids } } });
  });
  afterAll(async () => {
    if (safe) {
      await db.courseInstance.deleteMany({ where: { courseId: { in: ids } } });
      await db.course.deleteMany({ where: { id: { in: ids } } });
    }
    await db.$disconnect();
  });

  it('leaves omitted courses untouched and updates explicitly listed courses', async () => {
    await service.updateCourseInstances([
      update([
        { courseId: ids[0], availability: ['SOIR'] },
        { courseId: ids[1], availability: ['JOUR'] }
      ])
    ]);
    await service.updateCourseInstances([
      update([{ courseId: ids[0], availability: ['JOUR'] }])
    ]);
    expect((await get())?.availability).toEqual(['JOUR']);
    expect((await get(ids[1]))?.availability).toEqual(['JOUR']);
  });

  it('uses the latest explicit update and removes an explicit blank offering', async () => {
    await service.updateCourseInstances([
      update([{ courseId: ids[0], availability: ['JOUR'] }]),
      update([{ courseId: ids[0], availability: ['SOIR'] }])
    ]);
    expect((await get())?.availability).toEqual(['SOIR']);
    await service.updateCourseInstances([
      update([{ courseId: ids[0], availability: [] }])
    ]);
    expect(await get()).toBeNull();
  });
});
