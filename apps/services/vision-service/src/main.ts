import 'reflect-metadata';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const logger = new ConsoleLogger({ json: true, timestamp: true });
  const app = await NestFactory.create(AppModule, { logger, bodyParser: false });
  const config = app.get(ConfigService);
  app.use(json({ limit: config.get<string>('jsonBodyLimit', '256kb') }));
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: config.get<string[]>('corsOrigins', []),
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Camera-Api-Key'],
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  await app.listen(config.get<number>('port', 3335), '0.0.0.0');
  logger.log(`Vision service listening on port ${config.get<number>('port', 3335)}`);
}

void bootstrap();
