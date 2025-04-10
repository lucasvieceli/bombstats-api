import { WalletNetwork } from '@/database/models/Wallet';
import { GetHouse } from '@/modules/house/use-cases/get-house';
import {
  GetHousesRetail,
  IGetHousesRetail,
} from '@/modules/house/use-cases/get-houses-retail';
import { Controller, Get, Param, Query } from '@nestjs/common';

@Controller('/:network/house')
export class HouseController {
  constructor(
    private getHouse: GetHouse,
    private getHousesRetail: GetHousesRetail,
  ) {}

  @Get('retail')
  async retail(
    @Param('network') network: WalletNetwork,
    @Query() params: Omit<IGetHousesRetail, 'network'>,
  ) {
    return await this.getHousesRetail.execute({
      network: network.toUpperCase() as WalletNetwork,
      ...params,
    });
  }

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
