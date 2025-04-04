import { WalletNetwork } from '@/database/models/Wallet';
import { StakeRankingWalletRepository } from '@/database/repositories/stake-ranking-wallet';
import { StakeSenRankingWalletRepository } from '@/database/repositories/stake-sen-ranking-wallet';
import { Injectable } from '@nestjs/common';

interface IGetTopTwentyWalletStake {
  network: WalletNetwork;
  token: string;
}

@Injectable()
export class GetTopTwentyWalletStake {
  constructor(
    private stakeRankingWalletRepository: StakeRankingWalletRepository,
    private stakeSenRankingWalletRepository: StakeSenRankingWalletRepository,
  ) {}
  async execute({ network, token }: IGetTopTwentyWalletStake) {
    if (network !== WalletNetwork.BSC && network !== WalletNetwork.POLYGON) {
      throw new Error('Invalid network');
    }

    if (token === 'sens') {
      return await this.stakeSenRankingWalletRepository.getTopTwentyWalletStake(
        network,
      );
    }

    return await this.stakeRankingWalletRepository.getTopTwentyWalletStake(
      network,
    );
  }
}
