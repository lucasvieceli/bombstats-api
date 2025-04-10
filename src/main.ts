import { startRpcStatusUpdater } from '@/utils/web3/web3';
import { BaseExceptionFilter, NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { AppModule } from './app.module';
import './instrument';
import * as admin from 'firebase-admin';
import * as fireBaseConfig from '@/../firebase.json';

async function bootstrap() {
  console.log('Starting');
  await startRpcStatusUpdater();
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  Sentry.setupNestErrorHandler(
    app,
    new BaseExceptionFilter(app.getHttpAdapter()),
  );
  admin.initializeApp({
    credential: admin.credential.cert(fireBaseConfig as any),
  });

  // await updateProxies();
  await app.listen(3000);
}
bootstrap();
