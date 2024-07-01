import {
  DatabaseModuleRoot,
  DatabaseModules,
} from '@/database/database.module';
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
  ],
  controllers: [
    ...ExtensionModules.controllers,
    ...WalletModules.controllers,
    ...StakeModules.controllers,
  ],
  providers: [
    ...DatabaseModules.providers,
    ...ExtensionModules.providers,
    ...WalletModules.providers,
    ...StakeModules.providers,
    SocketGateway,
    SocketService,
  ],
})
export class AppModule {}
