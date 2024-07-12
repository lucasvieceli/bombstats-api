import { WalletNetwork } from '@/database/models/Wallet';
import { GetTopTwentyRarityHeroes } from '@/modules/stake/use-cases/get-top-twenty-rarity-heroes';
import { GetTopTwentyWalletStake } from '@/modules/stake/use-cases/get-top-twenty-wallet-stake';
import { Controller, Get, Param } from '@nestjs/common';

@Controller('/:network/stake')
export class StakeController {
  constructor(
    private getTopTwentyRarityHeroes: GetTopTwentyRarityHeroes,
    private getTopTwentyWalletStake: GetTopTwentyWalletStake,
  ) {}

  @Get('top-twenty-heroes-by-rarity/:rarity')
  async top20Wallets(
    @Param('network') network: WalletNetwork,
    @Param('rarity') rarity: number,
  ) {
    return await this.getTopTwentyRarityHeroes.execute({
      rarity,
      network: network.toUpperCase() as WalletNetwork,
    });
  }

  @Get('top-twenty-wallets')
  async top20StakeWallets(@Param('network') network: WalletNetwork) {
    return await this.getTopTwentyWalletStake.execute({
      network: network.toUpperCase() as WalletNetwork,
    });
  }
}
