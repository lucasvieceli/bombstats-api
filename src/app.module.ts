import {
  DatabaseModuleRoot,
  DatabaseModules,
} from '@/database/database.module';
import { ClaimModules } from '@/modules/claim/claim.module';
import { CronModules } from '@/modules/cron/cron.module';
import { ExtensionModules } from '@/modules/extension/extension.module';
import { StakeModules } from '@/modules/stake/stake.module';
import { WalletModules } from '@/modules/wallet/wallet.module';
import { SocketGateway, SocketService } from '@/services/websocket';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    DatabaseModuleRoot,
    ...ExtensionModules.imports,
    ...WalletModules.imports,
    ...StakeModules.imports,
    ...ClaimModules.imports,
    ...CronModules.imports,
  ],
  controllers: [
    ...ExtensionModules.controllers,
    ...WalletModules.controllers,
    ...StakeModules.controllers,
    ...ClaimModules.controllers,
  ],
  providers: [
    ...DatabaseModules.providers,
    ...ExtensionModules.providers,
    ...WalletModules.providers,
    ...StakeModules.providers,
    ...ClaimModules.providers,
    ...CronModules.providers,
    SocketGateway,
    SocketService,
  ],
})
export class AppModule {}
