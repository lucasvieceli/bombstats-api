import { ClaimToken } from '@/database/models/Claim';
import { WalletNetwork } from '@/database/models/Wallet';
import { UpdateClaimRanking } from '@/modules/claim/use-cases/update-claim-ranking';
import { UpdateStakeRanking } from '@/modules/stake/use-cases/update-stake-ranking';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

@Processor('cron-every-hour', { concurrency: 1 })
export class CronEveryHour extends WorkerHost {
  constructor(
    private updateStakeRanking: UpdateStakeRanking,
    private updateClaimRanking: UpdateClaimRanking,
  ) {
    super();
  }

  async process(): Promise<any> {
    Logger.log('Cron job EVERY_HOUR');
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

      Logger.log('terminou job EVERY_HOUR');
    } catch (e) {
      Logger.error(`${e.message} EVERY_HOUR`);
      Sentry.captureException(e);
    }
  }
}
