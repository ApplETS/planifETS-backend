import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  DistributionDto,
  TokenStatsDto,
} from './dtos/token-stats.dto';

const CHARS_PER_TOKEN = 4;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function computeDistribution(values: number[]): DistributionDto {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p90: 0, p95: 0, p99: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round((sum / sorted.length) * 100) / 100,
    median: Math.round(percentile(sorted, 50)),
    p90: Math.round(percentile(sorted, 90)),
    p95: Math.round(percentile(sorted, 95)),
    p99: Math.round(percentile(sorted, 99)),
  };
}

@Injectable()
export class TokenStatsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(TokenStatsService.name);

  public async getTokenStats(): Promise<TokenStatsDto> {
    this.logger.verbose('getTokenStats');

    const rows = await this.prisma.course.findMany({
      select: {
        description: true,
        programs: {
          select: {
            prerequisites: { select: { prerequisiteId: true } },
            unstructuredPrerequisite: true,
          },
        },
        courseInstances: {
          select: {
            sessionTrimester: true,
            availability: true,
          },
        },
      },
    });

    const lengths: number[] = [];
    let emptyCount = 0;

    const prereqCounts: number[] = [];
    let coursesWithPrerequisites = 0;
    let coursesWithUnstructuredPrerequisite = 0;
    let totalPrereqEdges = 0;

    const programCounts: number[] = [];
    let coursesWithoutPrograms = 0;
    let totalProgramLinks = 0;

    const instanceCounts: number[] = [];
    let coursesWithInstances = 0;
    let totalInstances = 0;
    const byTrimester = { AUTOMNE: 0, HIVER: 0, ETE: 0 };
    const byAvailability = { JOUR: 0, SOIR: 0, INTENSIF: 0 };

    for (const { description, programs, courseInstances } of rows) {
      const length = description?.length ?? 0;
      if (length === 0) {
        emptyCount += 1;
      } else {
        lengths.push(length);
      }

      const programCount = programs.length;
      totalProgramLinks += programCount;
      if (programCount === 0) {
        coursesWithoutPrograms += 1;
      } else {
        programCounts.push(programCount);
      }

      const prereqIds = new Set(
        programs.flatMap((p) => p.prerequisites.map((pr) => pr.prerequisiteId)),
      );
      const prereqCount = prereqIds.size;
      totalPrereqEdges += prereqCount;
      if (prereqCount > 0) {
        coursesWithPrerequisites += 1;
        prereqCounts.push(prereqCount);
      }
      if (programs.some((p) => p.unstructuredPrerequisite)) {
        coursesWithUnstructuredPrerequisite += 1;
      }

      const instanceCount = courseInstances.length;
      totalInstances += instanceCount;
      if (instanceCount > 0) {
        coursesWithInstances += 1;
        instanceCounts.push(instanceCount);
      }
      for (const { sessionTrimester, availability } of courseInstances) {
        byTrimester[sessionTrimester] += 1;
        for (const av of availability) {
          byAvailability[av] += 1;
        }
      }
    }

    const characters = computeDistribution(lengths);
    const tokenLengths = lengths.map((l) => Math.ceil(l / CHARS_PER_TOKEN));
    const estimatedTokens = computeDistribution(tokenLengths);

    return {
      total: rows.length,
      count: lengths.length,
      emptyCount,
      characters,
      estimatedTokens,
      charsPerToken: CHARS_PER_TOKEN,
      prerequisites: {
        coursesWithPrerequisites,
        coursesWithUnstructuredPrerequisite,
        totalEdges: totalPrereqEdges,
        prerequisitesPerCourse: computeDistribution(prereqCounts),
      },
      programs: {
        coursesWithPrograms: programCounts.length,
        coursesWithoutPrograms,
        totalLinks: totalProgramLinks,
        programsPerCourse: computeDistribution(programCounts),
      },
      instances: {
        coursesWithInstances,
        totalInstances,
        instancesPerCourse: computeDistribution(instanceCounts),
        byTrimester,
        byAvailability,
      },
    };
  }
}
