import { ClaimToken } from '@/database/models/Claim';
import { WalletNetwork } from '@/database/models/Wallet';
import { UpdateClaimRanking } from '@/modules/claim/use-cases/update-claim-ranking';
import { UpdateStakeRanking } from '@/modules/stake/use-cases/update-stake-ranking';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CronService {
  constructor(
    private updateStakeRanking: UpdateStakeRanking,
    private updateClaimRanking: UpdateClaimRanking,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    Logger.log('Cron job');
    try {
      await this.updateStakeRanking.execute({ network: WalletNetwork.POLYGON });
      await this.updateStakeRanking.execute({ network: WalletNetwork.BSC });
      await this.updateClaimRanking.execute({
        network: WalletNetwork.POLYGON,
        token: ClaimToken.BCOIN,
      });
      await this.updateClaimRanking.execute({
        network: WalletNetwork.BSC,
        token: ClaimToken.BCOIN,
      });
    } catch (e) {
      Logger.error(e);
    }
  }
}
