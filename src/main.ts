import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeWeb3 } from '@/utils/web3/web3';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  await initializeWeb3();
  await app.listen(3000);
}
bootstrap();
