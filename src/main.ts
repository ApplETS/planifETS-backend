import { LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());

  //Log levels
  if (process.env.LOG_LEVELS) {
    app.useLogger(process.env.LOG_LEVELS.split(',') as LogLevel[]);
  } else {
    app.useLogger(['error', 'warn', 'log']);
  }

  //Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PlanifÉTS API')
    .setExternalDoc('JSON API Documentation', '/api-json')
    .setVersion('1.0')
    .addServer('http://localhost:3000/', 'Local environment')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerOptions = {
    swaggerOptions: {
      displayRequestDuration: true,
    },
  };
  SwaggerModule.setup('api', app, document, swaggerOptions);

  //Start the app
  await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3000);
}
bootstrap();
