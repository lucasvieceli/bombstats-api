import { WalletNetwork } from '@/database/models/Wallet';
import { StakeRankingWalletRepository } from '@/database/repositories/stake-ranking-wallet';
import { Injectable } from '@nestjs/common';

interface IGetTopTwentyWalletStake {
  network: WalletNetwork;
}

@Injectable()
export class GetTopTwentyWalletStake {
  constructor(
    private stakeRankingWalletRepository: StakeRankingWalletRepository,
  ) {}
  async execute({ network }: IGetTopTwentyWalletStake) {
    if (network !== WalletNetwork.BSC && network !== WalletNetwork.POLYGON) {
      throw new Error('Invalid network');
    }

    return await this.stakeRankingWalletRepository.getTopTwentyWalletStake(
      network,
    );
  }
}
