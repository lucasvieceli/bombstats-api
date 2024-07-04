import { WalletNetwork } from '@/database/models/Wallet';
import { GetTopTwentyRarityHeroes } from '@/modules/stake/use-cases/get-top-twenty-rarity-heroes';
import { Controller, Get, Param } from '@nestjs/common';

@Controller('/:network/stake')
export class StakeController {
  constructor(private getTopTwentyRarityHeroes: GetTopTwentyRarityHeroes) {}

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
}
