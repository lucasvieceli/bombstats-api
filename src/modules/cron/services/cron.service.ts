import { HeroRepository } from '@/database/repositories/hero-repository';
import { UpdatePriceTokens } from '@/modules/cron/use-cases/update-price-tokens';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';

@Injectable()
export class CronService implements OnModuleInit {
  constructor(
    private updatePriceTokens: UpdatePriceTokens,
    private heroRepository: HeroRepository,
    @InjectQueue('cron-every-hour') private readonly cronEveryHour: Queue,
  ) {}

  async onModuleInit() {
    this.cronEveryHour.add('cronEveryHour', '');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    if (process.env.NODE_ENV === 'development') {
      Logger.log('Cron job every hour is disabled in development mode');
      return;
    }
    this.cronEveryHour.add('cronEveryHour', '');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCronMinute() {
    if (process.env.NODE_ENV === 'development') {
      Logger.log('Cron job is disabled in development mode');
      return;
    }

    Logger.log('Cron job');
    try {
      await this.updatePriceTokens.execute();
    } catch (e) {
      Logger.error(e);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async MaintenanceDataBase() {
    if (process.env.NODE_ENV === 'development') {
      Logger.log('Cron job is disabled in development mode');
      return;
    }

    Logger.log('Cron MaintenanceDataBase');
    try {
      await this.heroRepository.manager.connection.query(
        'OPTIMIZE TABLE map_reward',
      );
      await this.heroRepository.manager.connection.query('OPTIMIZE TABLE hero');
      await this.heroRepository.manager.connection.query(
        'OPTIMIZE TABLE stake_ranking_hero',
      );
      await this.heroRepository.manager.connection.query(
        'OPTIMIZE TABLE stake_ranking_wallet',
      );
      await this.heroRepository.manager.connection.query(
        'OPTIMIZE TABLE stake_sen_ranking_hero',
      );
      await this.heroRepository.manager.connection.query(
        'OPTIMIZE TABLE stake_sen_ranking_wallet',
      );
    } catch (e) {
      Logger.error(e);
    }
  }
}
