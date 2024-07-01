import { DataSource, Repository } from 'typeorm';

import { Stake } from '@/database/models/Stake';
import { Injectable } from '@nestjs/common';
import { WalletNetwork } from '@/database/models/Wallet';
import { StakeRankingWallet } from '@/database/models/StakeRankingWallet';

@Injectable()
export class StakeRepository extends Repository<Stake> {
  constructor(private dataSource: DataSource) {
    super(Stake, dataSource.createEntityManager());
  }

  async updateStakeWalletRanking(network: WalletNetwork) {
    await this.manager.getRepository(StakeRankingWallet).delete({ network });
    await this.query(
      `
      INSERT INTO stake_ranking_wallet (id, wallet, network, amount, createdAt, updatedAt, position)
          SELECT 
            UUID(),
            stake.wallet AS wallet,
            stake.network AS network,
            SUM(stake.amount) AS total,
            NOW() AS createdAt,
            NOW() AS updatedAt,
            RANK() OVER (ORDER BY SUM(stake.amount) DESC) AS position
          FROM stake
          WHERE stake.network = ?
          GROUP BY stake.wallet, stake.network
          ORDER BY total DESC;
    `,
      [network],
    );
  }

  async getStakesByWallet(wallet: string, network: WalletNetwork) {
    return this.find({
      select: {
        amount: true,
        date: true,
        withdraw: true,
        heroId: true,
        rarity: true,
      },
      where: { wallet, network },
      order: { date: 'DESC' },
    });
  }
}
