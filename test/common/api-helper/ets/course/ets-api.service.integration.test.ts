import { createEtsApiTestModule, expectDto } from 'test/test-utils/ets-api';

import { CourseByIdEtsApiDto } from '@/common/api-helper/ets/course/dtos/course-by-id-ets-api.dto';
import { CourseIndexResponseDto } from '@/common/api-helper/ets/course/dtos/course-index-response.dto';
import { EtsApiService } from '@/common/api-helper/ets/course/ets-api.service';
import { extractNumberFromString } from '@/common/utils/stringUtil';
import {
  ETS_API_GET_ALL_COURSES,
  ETS_API_GET_COURSES_BY_IDS,
  ETS_USER_AGENT
} from '@/common/utils/url/url-constants';

describe('EtsApiService (live ETS contract)', () => {
  let context: Awaited<ReturnType<typeof createEtsApiTestModule>>;
  let service: EtsApiService;
  let raw: CourseIndexResponseDto;
  let courses: Awaited<
    ReturnType<EtsApiService['fetchAllCoursesWithoutCredits']>
  >;
  let rawDetails: CourseByIdEtsApiDto[];

  beforeAll(async () => {
    context = await createEtsApiTestModule();
    service = context.moduleRef.get(EtsApiService);
    // Validate raw production responses before the real service maps them.
    // No mocked adapter, fixture or response replay is used in this suite.
    context.client.interceptors.response.use((response) => {
      expect(response.status).toBe(200);
      expect(response.config.headers.get('User-Agent')).toBe(ETS_USER_AGENT);
      if (response.config.url === ETS_API_GET_ALL_COURSES) {
        raw = expectDto(CourseIndexResponseDto, response.data);
      } else {
        expect(
          response.config.url?.startsWith(ETS_API_GET_COURSES_BY_IDS)
        ).toBe(true);
        expect(Array.isArray(response.data)).toBe(true);
        rawDetails = (response.data as unknown[]).map((course) =>
          expectDto(CourseByIdEtsApiDto, course)
        );
      }
      return response;
    });
    courses = await service.fetchAllCoursesWithoutCredits();
  }, 60000);

  afterAll(async () => {
    await context?.moduleRef.close();
  });

  it('matches the raw course index DTO for every entry', () => {
    const payload = expectDto(CourseIndexResponseDto, raw);
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.codes.length).toBeGreaterThan(0);
    expect(payload.cycles.length).toBeGreaterThan(0);
    expect(new Set(payload.results.map((course) => course.id)).size).toBe(
      payload.results.length
    );
    payload.results.forEach((course) => {
      expect(payload.codes).toContain(course.code3);
      if (course.cycle !== null) {
        expect(payload.cycles).toContain(course.cycle);
      }
    });
  });

  it('maps the real course index response into service output', () => {
    expect(courses).toEqual(
      raw.results.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        code: course.code,
        cycle: course.cycle ? extractNumberFromString(course.cycle) : null
      }))
    );
  });

  it.each([1, 3])(
    'fetches and maps real course details for %i dynamic IDs',
    async (count) => {
      expect(courses.length).toBeGreaterThanOrEqual(count);
      const selected = courses.slice(0, count);
      const ids = selected.map((course) => course.id);
      const details = await service.fetchCoursesById(ids.join(','));
      expect(details.map((course) => course.id).sort()).toEqual(
        [...ids].sort()
      );
      expect(details).toEqual(
        rawDetails.map(({ id, title, code, credits }) => ({
          id,
          title,
          code,
          credits
        }))
      );
      details.forEach((course) => {
        expect(course.code).toBe(
          selected.find((entry) => entry.id === course.id)?.code
        );
      });
    },
    60000
  );
});
