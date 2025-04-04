import { WalletNetwork } from '@/database/models/Wallet';
import { StakeRankingHeroRepository } from '@/database/repositories/stake-ranking-hero';
import { GetHeroesByIds } from '@/modules/hero/use-cases/get-heroes-by-ids';
import { Injectable } from '@nestjs/common';

interface IGetTopTwentyRarityHeroes {
  network: WalletNetwork;
  rarity: number;
  token: string;
}

@Injectable()
export class GetTopTwentyRarityHeroes {
  constructor(
    private stakeRankingHeroRepository: StakeRankingHeroRepository,
    private getHeroFromIds: GetHeroesByIds,
  ) {}
  async execute({ network, rarity, token }: IGetTopTwentyRarityHeroes) {
    if (rarity < 0 || rarity > 5) {
      throw new Error('Invalid rarity');
    }
    if (network !== WalletNetwork.BSC && network !== WalletNetwork.POLYGON) {
      throw new Error('Invalid network');
    }

    const list = await this.stakeRankingHeroRepository.getTopTwentyRarityHeroes(
      rarity,
      network,
      token,
    );

    if (!list) {
      return { heroes: [], amount: 0, average: 0, totalHeroes: 0 };
    }

    const heroesIds = list.heroes.map((hero) => hero.heroId);

    const heroes = await this.getHeroFromIds.execute({
      ids: heroesIds,
      network,
    });

    const heroesMap = list.heroes.map((hero) => ({
      ...hero,
      hero: heroes.find(({ id }) => id.toString() == hero.heroId.toString()),
    }));
    list.heroes = heroesMap;

    return list;
  }
}
