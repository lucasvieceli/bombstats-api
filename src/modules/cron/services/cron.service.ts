import { UpdatePriceTokens } from '@/modules/cron/use-cases/update-price-tokens';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';

@Injectable()
export class CronService {
  constructor(
    private updatePriceTokens: UpdatePriceTokens,
    @InjectQueue('cron-every-hour') private readonly cronEveryHour: Queue,
  ) {
    this.cronEveryHour.add('cronEveryHour', '');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.cronEveryHour.add('cronEveryHour', '');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCronMinute() {
    Logger.log('Cron job');
    try {
      await this.updatePriceTokens.execute();
    } catch (e) {
      Logger.error(e);
    }
  }
}
