import { initializeWeb3 } from '@/utils/web3/web3';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  await initializeWeb3();
  await app.listen(3000);
}
bootstrap();
