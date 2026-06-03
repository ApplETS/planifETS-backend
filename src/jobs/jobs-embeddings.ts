import { INestApplicationContext, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { CourseEmbeddingIndexerService } from '../embedding/embedding-course-indexer.service';

const logger = new Logger('IndexCourseEmbeddingsJob');

async function bootstrap(): Promise<void> {
  let app: INestApplicationContext | undefined;

  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'warn', 'error'],
    });

    const indexer = app.get(CourseEmbeddingIndexerService, {
      strict: false,
    });

    await indexer.run();
  } catch (error) {
    logger.error(`Course embedding indexation failed: ${formatError(error)}`);
    process.exitCode = 1;
  } finally {
    if (app) {
      await app.close();
    }
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

void bootstrap();
