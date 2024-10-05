import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Queue } from 'bullmq';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { QueuesEnum } from './jobs/queues.enum';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());

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

  //Bull Dashboard
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/queues');

  const bullBoardQueues = Object.values(QueuesEnum).map(
    (queueName) => new BullMQAdapter(new Queue(queueName)),
  );
  console.log('bullBoardQueues:', bullBoardQueues);
  createBullBoard({
    queues: bullBoardQueues,
    serverAdapter,
  });
  app.use('/queues', serverAdapter.getRouter());

  //Start the app
  await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3000);
}
bootstrap();
