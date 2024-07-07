import { BaseExceptionFilter, NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { AppModule } from './app.module';
import './instrument';
import { startRpcStatusUpdater } from '@/utils/web3/web3';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  Sentry.setupNestErrorHandler(
    app,
    new BaseExceptionFilter(app.getHttpAdapter()),
  );
  await startRpcStatusUpdater();
  await app.listen(3000);
}
bootstrap();
