import { WalletNetwork } from '@/database/models/Wallet';
import { GetTopHeroesGlobalByRarity } from '@/modules/stake/use-cases/get-top-heroes-global-by-rarity';
import { GetTopTwentyRarityHeroes } from '@/modules/stake/use-cases/get-top-twenty-rarity-heroes';
import { GetTopTwentyWalletStake } from '@/modules/stake/use-cases/get-top-twenty-wallet-stake';
import { GetTopWalletStakeGlobal } from '@/modules/stake/use-cases/get-top-wallet-stake-global';
import { Controller, Get, Param, Query } from '@nestjs/common';

@Controller('/:network/stake')
export class StakeController {
  constructor(
    private getTopTwentyRarityHeroes: GetTopTwentyRarityHeroes,
    private getTopTwentyWalletStake: GetTopTwentyWalletStake,
    private getTopWalletStakeGlobal: GetTopWalletStakeGlobal,
    private getTopHeroesGlobalByRarity: GetTopHeroesGlobalByRarity,
  ) {}

  @Get('top-twenty-heroes-by-rarity/:rarity')
  async top20Wallets(
    @Param('network') network: WalletNetwork,
    @Param('rarity') rarity: number,
    @Query('token') token: string = 'bcoin',
  ) {
    return await this.getTopTwentyRarityHeroes.execute({
      rarity,
      token,
      network: network.toUpperCase() as WalletNetwork,
    });
  }
  @Get('top-heroes-global-by-rarity/:rarity')
  async topHeroesGlobalByRarity(
    @Param('rarity') rarity: number,
    @Query('token') token: string = 'bcoin',
  ) {
    return await this.getTopHeroesGlobalByRarity.execute({
      rarity,
      token,
    });
  }

  @Get('top-twenty-wallets')
  async top20StakeWallets(
    @Param('network') network: WalletNetwork,
    @Query('token') token: string = 'bcoin',
  ) {
    return await this.getTopTwentyWalletStake.execute({
      network: network.toUpperCase() as WalletNetwork,
      token,
    });
  }
  @Get('top-wallets-global')
  async topStakeWalletGlobal(@Query('token') token: string = 'bcoin') {
    return await this.getTopWalletStakeGlobal.execute({
      token,
    });
  }
}
