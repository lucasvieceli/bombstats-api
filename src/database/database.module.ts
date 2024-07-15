import { ClaimRankingWalletRepository } from '@/database/repositories/claim-ranking-wallet-repository';
import { ClaimRepository } from '@/database/repositories/claim-repository';
import { FarmSessionRepository } from '@/database/repositories/farm-session-repository';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { MapBlockRepository } from '@/database/repositories/map-block-repository';
import { MapRepository } from '@/database/repositories/map-repository';
import { MapRewardRepository } from '@/database/repositories/map-reward-repository';
import { StakeRankingHeroRepository } from '@/database/repositories/stake-ranking-hero';
import { StakeRankingWalletRepository } from '@/database/repositories/stake-ranking-wallet';
import { StakeRepository } from '@/database/repositories/stake-repository';
import { TotalsRepository } from '@/database/repositories/totals-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import dataSource from './config';
import { FarmAverageRepository } from '@/database/repositories/farm-average-repository';
import { HouseRepository } from '@/database/repositories/house-repository';

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
    StakeRankingHeroRepository,
    ClaimRankingWalletRepository,
    ClaimRepository,
    TotalsRepository,
    HeroRepository,
    FarmAverageRepository,
    HouseRepository,
  ],
};
