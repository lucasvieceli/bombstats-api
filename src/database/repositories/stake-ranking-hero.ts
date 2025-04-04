import { DataSource, FindOptionsOrder, Repository } from 'typeorm';

import { StakeRankingHero } from '@/database/models/StakeRankingHero';
import { WalletNetwork } from '@/database/models/Wallet';
import { Injectable } from '@nestjs/common';
import { chunkArray } from '@/utils';

@Injectable()
export class StakeRankingHeroRepository extends Repository<StakeRankingHero> {
  constructor(private dataSource: DataSource) {
    super(StakeRankingHero, dataSource.createEntityManager());
  }

  async getTopTwentyRarityHeroes(
    rarity: number,
    network: WalletNetwork,
    token: string,
  ) {
    let order: FindOptionsOrder<StakeRankingHero> = {
      positionBcoin: 'ASC',
    };
    let column = 'stake';

    if (token === 'sens') {
      order = { positionSen: 'ASC' };
      column = 'stakeSen';
    }

    const [result, totalHeroes] = await Promise.all([
      this.find({
        where: {
          rarity,
          network,
        },
        order,
        take: 50,
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
        stake: item.stake,
        stakeSen: item.stakeSen,
        positionBcoin: item.positionBcoin,
        positionSen: item.positionSen,
      })),
      amount: result.reduce((acc, item) => acc + item[column], 0),
      average:
        result.reduce((acc, item) => acc + item[column], 0) / totalHeroes,
      totalHeroes,
    };
  }
  async getTopHeroesGlobalByRarity(rarity: number, token: string) {
    let order: FindOptionsOrder<StakeRankingHero> = {
      positionBcoinGlobal: 'ASC',
    };
    let column = 'stake';

    if (token === 'sens') {
      order = { positionSenGlobal: 'ASC' };
      column = 'stakeSen';
    }

    const [result, totalHeroes] = await Promise.all([
      this.find({
        where: {
          rarity,
        },
        order,
        take: 50,
        relations: ['hero'],
      }),
      this.count({
        where: {
          rarity,
        },
      }),
    ]);
    return {
      heroes: result,
      amount: result.reduce((acc, item) => acc + item[column], 0),
      average:
        result.reduce((acc, item) => acc + item[column], 0) / totalHeroes,
      totalHeroes,
    };
  }

  async createRankingGlobal(rarity: number) {
    const result = await this.find({
      where: {
        rarity,
      },
    });

    const rankingWalletGlobal = result
      .sort((a, b) => b.stake - a.stake)
      .map((item, index) => ({
        ...item,
        positionBcoinGlobal: index + 1,
      }))
      .sort((a, b) => b.stakeSen - a.stakeSen)
      .map((item, index) => {
        return {
          ...item,
          positionSenGlobal: index + 1,
        };
      });

    const chunks = chunkArray(rankingWalletGlobal, 1000);
    for (const chunk of chunks) {
      await this.save(chunk);
    }
  }
}
