import { DataSource, Repository } from 'typeorm';

import { StakeRankingWallet } from '@/database/models/StakeRankingWallet';
import { WalletNetwork } from '@/database/models/Wallet';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StakeRankingWalletRepository extends Repository<StakeRankingWallet> {
  constructor(private dataSource: DataSource) {
    super(StakeRankingWallet, dataSource.createEntityManager());
  }

  async getPositionRanking(walletId: string, network: WalletNetwork) {
    const wallet = await this.findOne({
      where: { wallet: walletId.toLowerCase(), network },
    });

    if (wallet) {
      return wallet.position;
    }
  }
}
