import { StakeRankingWalletGlobalRepository } from '@/database/repositories/stake-ranking-wallet-global';
import { Injectable } from '@nestjs/common';

interface IGetTopWalletStakeGlobal {
  token: string;
}

@Injectable()
export class GetTopWalletStakeGlobal {
  constructor(
    private stakeRankingWalletGlobalRepository: StakeRankingWalletGlobalRepository,
  ) {}
  async execute({ token }: IGetTopWalletStakeGlobal) {
    return await this.stakeRankingWalletGlobalRepository.getTopWalletStake(
      token,
    );
  }
}
