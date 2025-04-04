import { DataSource, FindOptionsOrder, Repository } from 'typeorm';

import { StakeRankingWalletGlobal } from '@/database/models/StakeRankingWalletGlobal';
import { Injectable } from '@nestjs/common';
import { StakeRankingWallet } from '@/database/models/StakeRankingWallet';
import { Wallet, WalletNetwork } from '@/database/models/Wallet';
import { chunkArray } from '@/utils';

@Injectable()
export class StakeRankingWalletGlobalRepository extends Repository<StakeRankingWalletGlobal> {
  constructor(private dataSource: DataSource) {
    super(StakeRankingWalletGlobal, dataSource.createEntityManager());
  }

  async createRankingWalletGlobal() {
    await this.delete({});

    const result = await this.manager
      .getRepository(StakeRankingWallet)
      .createQueryBuilder('stakeRankingWallet')
      .select('SUM(stakeRankingWallet.stake)', 'stake')
      .addSelect('SUM(stakeRankingWallet.stakeSen)', 'stakeSen')
      .addSelect('LOWER(stakeRankingWallet.wallet)', 'wallet')
      .groupBy('wallet')
      .getRawMany();

    const wallets = result.map((item) => item.wallet);
    const repoWallet = this.manager.getRepository(Wallet);
    await repoWallet.upsert(
      wallets.map((walletId) => ({ walletId, network: WalletNetwork.BSC })),
      ['walletId', 'network'],
    );
    await repoWallet.upsert(
      wallets.map((walletId) => ({ walletId, network: WalletNetwork.POLYGON })),
      ['walletId', 'network'],
    );

    const rankingWalletGlobal = result
      .map((item) => {
        return {
          wallet: item.wallet,
          stake: item.stake,
          stakeSen: item.stakeSen,
          positionSen: 0,
          positionBcoin: 0,
        };
      })
      .sort((a, b) => b.stake - a.stake)
      .map((item, index) => ({
        ...item,
        positionBcoin: index + 1,
      }))
      .sort((a, b) => b.stakeSen - a.stakeSen)
      .map((item, index) => {
        return {
          ...item,
          positionSen: index + 1,
        };
      });
    const chunks = chunkArray(rankingWalletGlobal, 1000);

    for (const chunk of chunks) {
      await this.save(chunk);
    }
  }

  async getTopWalletStake(token: string) {
    let order: FindOptionsOrder<StakeRankingWalletGlobal> = {
      positionBcoin: 'ASC',
    };
    let column = 'stake';

    if (token === 'sens') {
      order = { positionSen: 'ASC' };
      column = 'stakeSen';
    }

    const [result, totalWallets] = await Promise.all([
      this.find({
        order,
        take: 50,
      }),
      this.count(),
    ]);
    return {
      wallets: result.map((item) => ({
        stake: item.stake,
        stakeSen: item.stakeSen,
        wallet: item.wallet,
        positionBcoin: item.positionBcoin,
        positionSen: item.positionSen,
      })),
      amount: result.reduce((acc, item) => acc + item[column], 0),
      average:
        result.reduce((acc, item) => acc + item[column], 0) / totalWallets,
      totalWallets,
    };
  }
}
