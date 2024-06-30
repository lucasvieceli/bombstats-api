import { WalletNetwork } from '@/database/models/Wallet';
import { GetWallet } from '@/modules/wallet/use-cases/get-wallet';
import { Controller, Get, Param } from '@nestjs/common';

@Controller('/:network/wallet')
export class WalletController {
  constructor(private getWallet: GetWallet) {}

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
