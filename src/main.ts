import { ClaimToken } from '@/database/models/Claim';
import { WalletNetwork } from '@/database/models/Wallet';
import { UpdateClaimRanking } from '@/modules/claim/use-cases/update-claim-ranking';
import { UpdateStakeRanking } from '@/modules/stake/use-cases/update-stake-ranking';
import { initializeWeb3 } from '@/utils/web3/web3';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  await initializeWeb3();
  await app.listen(3000);

  const updateStakeRanking = app.get(UpdateStakeRanking);
  const updateClaimRanking = app.get(UpdateClaimRanking);
  await updateClaimRanking.execute({
    network: WalletNetwork.BSC,
    token: ClaimToken.BCOIN,
  });
  setInterval(
    async () => {
      await updateStakeRanking.execute({ network: WalletNetwork.POLYGON });
      await updateStakeRanking.execute({ network: WalletNetwork.BSC });
      await updateClaimRanking.execute({
        network: WalletNetwork.POLYGON,
        token: ClaimToken.BCOIN,
      });
      await updateClaimRanking.execute({
        network: WalletNetwork.BSC,
        token: ClaimToken.BCOIN,
      });
    },
    1000 * 60 * 30,
  );
}
bootstrap();
