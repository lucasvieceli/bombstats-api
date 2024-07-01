import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import dataSource from './config';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { MapRewardRepository } from '@/database/repositories/map-reward-repository';
import { MapRepository } from '@/database/repositories/map-repository';
import { MapBlockRepository } from '@/database/repositories/map-block-repository';
import { FarmSessionRepository } from '@/database/repositories/farm-session-repository';
import { StakeRepository } from '@/database/repositories/stake-repository';
import { StakeRankingWalletRepository } from '@/database/repositories/stake-ranking-wallet';

export const DatabaseModuleRoot = TypeOrmModule.forRoot(
  dataSource as TypeOrmModuleOptions,
);

export const DatabaseModules = {
  providers: [
    WalletRepository,
    MapRewardRepository,
    MapRepository,
    MapBlockRepository,
    FarmSessionRepository,
    StakeRepository,
    StakeRankingWalletRepository,
  ],
};
