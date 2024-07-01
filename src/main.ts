import { initializeWeb3 } from '@/utils/web3/web3';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UpdateStakeRanking } from '@/modules/stake/use-cases/update-stake-ranking';
import { WalletNetwork } from '@/database/models/Wallet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  await initializeWeb3();
  await app.listen(3000);

  const updateStakeRanking = app.get(UpdateStakeRanking);

  await updateStakeRanking.execute({ network: WalletNetwork.POLYGON });
  await updateStakeRanking.execute({ network: WalletNetwork.BSC });

  setInterval(
    async () => {
      await updateStakeRanking.execute({ network: WalletNetwork.POLYGON });
      await updateStakeRanking.execute({ network: WalletNetwork.BSC });
    },
    1000 * 60 * 30,
  );
}
bootstrap();
