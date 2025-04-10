import { WalletNetwork } from '@/database/models/Wallet';
import { GetBestCostQuartz } from '@/modules/hero/use-cases/get-best-cost-quartz';
import { GetHero } from '@/modules/hero/use-cases/get-hero';
import {
  GetHeroesRetail,
  IGetHeroesRetail,
} from '@/modules/hero/use-cases/get-heroes-retail';
import { Controller, Get, Param, Query } from '@nestjs/common';

@Controller('/:network/hero')
export class HeroController {
  constructor(
    private getHero: GetHero,
    private getHeroesRetail: GetHeroesRetail,
    private getBestCostQuartz: GetBestCostQuartz,
  ) {}

  @Get('retail')
  async retail(
    @Param('network') network: WalletNetwork,
    @Query() params: Omit<IGetHeroesRetail, 'network'>,
  ) {
    return await this.getHeroesRetail.execute({
      network: network.toUpperCase() as WalletNetwork,
      ...params,
    });
  }

  @Get('best-cost-quartz')
  async bestCostQuartz(@Param('network') network: WalletNetwork) {
    return await this.getBestCostQuartz.execute({
      network: network.toUpperCase() as WalletNetwork,
    });
  }

  @Get(':id')
  async extension(
    @Param('id') id: string,
    @Param('network') network: WalletNetwork,
  ) {
    return await this.getHero.execute({
      id,
      network: network.toUpperCase() as WalletNetwork,
    });
  }
}
