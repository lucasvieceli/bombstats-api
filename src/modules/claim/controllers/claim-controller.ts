import { ClaimToken } from '@/database/models/Claim';
import { WalletNetwork } from '@/database/models/Wallet';
import { ClaimRankingWalletRepository } from '@/database/repositories/claim-ranking-wallet-repository';
import { Controller, Get, Param } from '@nestjs/common';

@Controller('/:network/claim')
export class ClaimController {
  constructor(
    private claimRankingWalletRepository: ClaimRankingWalletRepository,
  ) {}

  @Get('top-twenty-wallets')
  async top20Wallets(@Param('network') network: WalletNetwork) {
    return await this.claimRankingWalletRepository.getTopTwentyWalletsLastWeek(
      ClaimToken.BCOIN,
      network.toUpperCase() as WalletNetwork,
    );
  }
}
