import { DataSource, Repository } from 'typeorm';

import { StakeRankingHero } from '@/database/models/StakeRankingHero';
import { Injectable } from '@nestjs/common';
import { WalletNetwork } from '@/database/models/Wallet';

@Injectable()
export class StakeRankingHeroRepository extends Repository<StakeRankingHero> {
  constructor(private dataSource: DataSource) {
    super(StakeRankingHero, dataSource.createEntityManager());
  }

  async getTopTwentyRarityHeroes(rarity: number, network: WalletNetwork) {
    const [result, totalHeroes] = await Promise.all([
      this.find({
        where: {
          rarity,
          network,
        },
        order: {
          position: 'ASC',
        },
        take: 20,
      }),
      this.count({
        where: {
          rarity,
          network,
        },
      }),
    ]);
    return {
      heroes: result.map((item) => ({
        heroId: item.heroId,
        amount: item.amount,
        position: item.position,
      })),
      amount: result.reduce((acc, item) => acc + item.amount, 0),
      average: result.reduce((acc, item) => acc + item.amount, 0) / totalHeroes,
      totalHeroes,
    };
  }
}
