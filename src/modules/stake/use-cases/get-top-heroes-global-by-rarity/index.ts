import { StakeRankingHeroRepository } from '@/database/repositories/stake-ranking-hero';
import { Injectable } from '@nestjs/common';

interface IGetTopHeroesGlobalByRarity {
  rarity: number;
  token: string;
}

@Injectable()
export class GetTopHeroesGlobalByRarity {
  constructor(private stakeRankingHeroRepository: StakeRankingHeroRepository) {}
  async execute({ rarity, token }: IGetTopHeroesGlobalByRarity) {
    if (rarity < 0 || rarity > 5) {
      throw new Error('Invalid rarity');
    }

    const list =
      await this.stakeRankingHeroRepository.getTopHeroesGlobalByRarity(
        rarity,
        token,
      );

    if (!list) {
      return { heroes: [], amount: 0, average: 0, totalHeroes: 0 };
    }

    return list;
  }
}
