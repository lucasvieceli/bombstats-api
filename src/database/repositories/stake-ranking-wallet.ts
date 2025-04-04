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

  async getTopTwentyWalletStake(network: WalletNetwork) {
    const [result, totalWallets] = await Promise.all([
      this.find({
        where: {
          network,
        },
        order: {
          position: 'ASC',
        },
        take: 50,
      }),
      this.count({
        where: {
          network,
        },
      }),
    ]);
    return {
      wallets: result.map((item) => ({
        stake: item.stake,
        stakeSen: item.stakeSen,
        wallet: item.wallet,
        position: item.position,
      })),
      amount: result.reduce((acc, item) => acc + item.stake, 0),
      average: result.reduce((acc, item) => acc + item.stake, 0) / totalWallets,
      totalWallets,
    };
  }
}
