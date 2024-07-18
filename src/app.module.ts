import {
  DatabaseModuleRoot,
  DatabaseModules,
} from '@/database/database.module';
import { ClaimModules } from '@/modules/claim/claim.module';
import { CronModules } from '@/modules/cron/cron.module';
import { ExtensionModules } from '@/modules/extension/extension.module';
import { HeroModules } from '@/modules/hero/hero.module';
import { HouseModules } from '@/modules/house/house.module';
import { StakeModules } from '@/modules/stake/stake.module';
import { WalletModules } from '@/modules/wallet/wallet.module';
import { OpenSeaService } from '@/services/opeSea';
import { SocketGateway, SocketService } from '@/services/websocket';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    DatabaseModuleRoot,
    ...ExtensionModules.imports,
    ...WalletModules.imports,
    ...StakeModules.imports,
    ...ClaimModules.imports,
    ...CronModules.imports,
    ...HeroModules.imports,
    ...HouseModules.imports,
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
        password:
          process.env.NODE_ENV === 'production' ? 'Bombstats@123' : undefined,
      },
    }),
    BullModule.registerQueue({
      name: 'extension-message',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    BullModule.registerQueue({
      name: 'hero-update',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    BullModule.registerQueue({
      name: 'house-update',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    BullModule.registerQueue({
      name: 'cron-every-hour',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    BullModule.registerQueue({
      name: 'webhook-quicknode',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    BullModule.registerQueue({
      name: 'on-hero-retail',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    BullModule.registerQueue({
      name: 'on-house-retail',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
  ],
  controllers: [
    ...ExtensionModules.controllers,
    ...WalletModules.controllers,
    ...StakeModules.controllers,
    ...ClaimModules.controllers,
    ...CronModules.controllers,
    ...HeroModules.controllers,
    ...HouseModules.controllers,
  ],
  providers: [
    ...DatabaseModules.providers,
    ...ExtensionModules.providers,
    ...WalletModules.providers,
    ...StakeModules.providers,
    ...ClaimModules.providers,
    ...CronModules.providers,
    ...HeroModules.providers,
    ...HouseModules.providers,
    SocketGateway,
    SocketService,
    // AlchemyService,
    OpenSeaService,
  ],
})
export class AppModule {}
