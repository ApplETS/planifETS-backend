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
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PlanifÉTS API')
    .setExternalDoc('JSON API Documentation', '/api-json')
    .setVersion('1.0')
    .addServer(`http://localhost:${port}/`, 'Local environment')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerOptions = {
    swaggerOptions: {
      displayRequestDuration: true,
    },
  };
  SwaggerModule.setup('api', app, document, swaggerOptions);

  //Start the app
  await app.listen(port);
  console.log(`Swagger is running on http://localhost:${port}/api`);
}
bootstrap();
