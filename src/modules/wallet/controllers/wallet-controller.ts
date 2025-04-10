import { WalletNetwork } from '@/database/models/Wallet';
import { GetWallet } from '@/modules/wallet/use-cases/get-wallet';
import {
  GetWalletSimulator,
  IGetWalletSimulator,
} from '@/modules/wallet/use-cases/get-wallet-simulator';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

@Controller('/:network/wallet')
export class WalletController {
  constructor(
    private getWallet: GetWallet,
    private getWalletSimulator: GetWalletSimulator,
  ) {}

  @Post('simulator')
  async WalletSimulator(
    @Param('network') network: WalletNetwork,
    @Body()
    body: Omit<IGetWalletSimulator, 'network'>,
  ) {
    return await this.getWalletSimulator.execute({
      network: network.toUpperCase() as WalletNetwork,
      houseRarity: body.houseRarity,
      quantityHeroes: body.quantityHeroes,
    });
  }

  @Get(':wallet')
  async extension(
    @Param('wallet') wallet: string,
    @Param('network') network: WalletNetwork,
  ) {
    return await this.getWallet.execute({
      wallet,
      network: network.toUpperCase() as WalletNetwork,
    });
  }
}
