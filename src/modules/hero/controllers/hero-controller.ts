import { WalletNetwork } from '@/database/models/Wallet';
import { GetHero } from '@/modules/hero/use-cases/get-hero';
import { Controller, Get, Param } from '@nestjs/common';

@Controller('/:network/hero')
export class HeroController {
  constructor(private getHero: GetHero) {}

  @Get(':id')
  async extension(
    @Param('id') id: number,
    @Param('network') network: WalletNetwork,
  ) {
    return await this.getHero.execute({
      id,
      network: network.toUpperCase() as WalletNetwork,
    });
  }
}
