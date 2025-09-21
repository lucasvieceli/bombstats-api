import { ClaimToken } from '@/database/models/Claim';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { UpdateClaimRanking } from '@/modules/claim/use-cases/update-claim-ranking';
import { UpdateOpenSea } from '@/modules/cron/use-cases/update-open-sea';
import { HeroUpdateQueue } from '@/modules/hero/processors/hero-update';
import { UpdateStakeRanking } from '@/modules/stake/use-cases/update-stake-ranking';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
// import * as Sentry from '@sentry/nestjs';
import { Like } from 'typeorm';

@Processor('cron-every-hour', { concurrency: 1 })
export class CronEveryHour extends WorkerHost implements OnModuleInit {
  constructor(
    private updateStakeRanking: UpdateStakeRanking,
    private updateClaimRanking: UpdateClaimRanking,
    private updateOpenSea: UpdateOpenSea,
    private heroRepository: HeroRepository,
    @InjectQueue('hero-update') private readonly heroUpdate: HeroUpdateQueue,
  ) {
    super();
  }

  onModuleInit() {
    // this.process();
    // this.updateOpenSea.execute();
    // (async () => {
    //   const job = await this.heroUpdate.add('hero-update', {
    //     heroes: ['3410795'],
    //     network: WalletNetwork.POLYGON,
    //   });
    //   const queueEvents = new QueueEvents('hero-update');
    //   console.log(await job.waitUntilFinished(queueEvents), 'aaa');
    // })();
  }

  async process(): Promise<any> {
    Logger.debug('Cron job EVERY_HOUR', 'EVERY_HOUR');
    try {
      await this.heroRepository.delete({ id: Like('0x%') });
      await this.updateOpenSea.execute();
      await Promise.all([
        this.updateStakeRanking.execute({ network: WalletNetwork.POLYGON }),
        this.updateStakeRanking.execute({ network: WalletNetwork.BSC }),
      ]);
      await this.updateClaimRanking.execute({
        network: WalletNetwork.POLYGON,
        token: ClaimToken.BCOIN,
      });
      await this.updateClaimRanking.execute({
        network: WalletNetwork.BSC,
        token: ClaimToken.BCOIN,
      });
      await this.updateStakeRanking.createRankingGlobal();

      Logger.debug('terminou job EVERY_HOUR', 'EVERY_HOUR');
    } catch (e) {
      console.error(e, 'EVERY_HOUR');
      Logger.error(`${e.message} EVERY_HOUR`);
      // Sentry.captureException(e);
    }
  }
}
