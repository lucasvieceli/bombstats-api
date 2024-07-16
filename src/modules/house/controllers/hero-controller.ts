import { WalletNetwork } from '@/database/models/Wallet';
import { GetHouse } from '@/modules/house/use-cases/get-house';
import { Controller, Get, Param } from '@nestjs/common';

@Controller('/:network/house')
export class HouseController {
  constructor(private getHouse: GetHouse) {}

  @Get(':id')
  async extension(
    @Param('id') id: string,
    @Param('network') network: WalletNetwork,
  ) {
    return await this.getHouse.execute({
      id,
      network: network.toUpperCase() as WalletNetwork,
    });
  }
}
