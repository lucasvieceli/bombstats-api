import { DataSource, Repository } from 'typeorm';

import { ClaimRankingWallet } from '@/database/models/ClaimRankingWallet';
import { WalletNetwork } from '@/database/models/Wallet';
import { Injectable } from '@nestjs/common';
import { ClaimToken } from '@/database/models/Claim';

@Injectable()
export class ClaimRankingWalletRepository extends Repository<ClaimRankingWallet> {
  constructor(private dataSource: DataSource) {
    super(ClaimRankingWallet, dataSource.createEntityManager());
  }

  async updateClaimRankingLastSevenDays(
    network: WalletNetwork,
    token: ClaimToken,
  ) {
    await this.delete({ network, token });
    await this.query(
      `
      INSERT INTO claim_ranking_wallet (id, wallet, network, amount, createdAt, updatedAt,token, position)
          SELECT 
            UUID(),
            claim.wallet AS wallet,
            claim.network AS network,
            SUM(claim.amount) AS total,
            NOW() AS createdAt,
            NOW() AS updatedAt,
            claim.token,
            RANK() OVER (ORDER BY SUM(claim.amount) DESC) AS position
          FROM claim
          WHERE claim.network = ?
          and claim.token = ?
          AND claim.createdAt >= NOW() - INTERVAL 7 DAY
          GROUP BY claim.wallet, claim.network
          ORDER BY total DESC;
    `,
      [network, token],
    );
  }

  async getPositionRanking(
    walletId: string,
    network: WalletNetwork,
    token: ClaimToken,
  ) {
    const wallet = await this.findOne({
      where: { wallet: walletId.toLowerCase(), network, token },
    });

    if (wallet) {
      return {
        position: wallet.position,
        amount: wallet.amount,
      };
    }
  }

  async getTopTwentyWalletsLastWeek(token: ClaimToken, network: WalletNetwork) {
    const [list, total] = await Promise.all([
      this.find({
        where: {
          token,
          network,
        },
        order: {
          position: 'ASC',
        },
        take: 50,
      }),
      this.count({ where: { token, network } }),
    ]);
    return {
      wallets: list.map((item) => ({
        wallet: item.wallet,
        amount: item.amount,
        position: item.position,
        average: item.amount / 7,
      })),
      amount: list.reduce((acc, item) => acc + item.amount, 0),
      average: list.reduce((acc, item) => acc + item.amount, 0) / 7,
      totalWallets: total,
    };
  }
}
