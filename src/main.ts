import "./instrument";

import { LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { SentryLogger } from "./common/logger/sentry.logger";

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    { bufferLogs: true } // Buffer logs until logger is set up
  );
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

  app.setGlobalPrefix('api');
  app.enableCors(
    {
      methods: 'GET',
    },
  );

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  //Log levels
  const sentryLogger = new SentryLogger();
  if (process.env.LOG_LEVELS) {
    sentryLogger.setLogLevels(process.env.LOG_LEVELS.split(',') as LogLevel[]);
  }
  app.useLogger(sentryLogger);


  //Swagger
  const version = process.env.APP_GIT_SHORT_SHA ? `1.0.0 (${process.env.APP_GIT_SHORT_SHA})` : '1.0.0';
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PlanifETS API')
    .setExternalDoc('JSON API Documentation', '/api-json')
    .setVersion(version)
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerOptions = {
    swaggerOptions: {
      displayRequestDuration: true,
    },
    useGlobalPrefix: true,
  };
  SwaggerModule.setup('docs', app, document, swaggerOptions);

  //Start the app
  await app.listen(port);
  console.log(`Swagger UI available at http://localhost:${port}/api/docs`);
}
bootstrap();
