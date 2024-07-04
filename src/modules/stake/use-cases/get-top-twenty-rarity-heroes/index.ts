import { WalletNetwork } from '@/database/models/Wallet';
import { StakeRankingHeroRepository } from '@/database/repositories/stake-ranking-hero';
import { getHeroesFromIds } from '@/utils/web3/hero';
import { Injectable } from '@nestjs/common';

interface IGetTopTwentyRarityHeroes {
  network: WalletNetwork;
  rarity: number;
}

@Injectable()
export class GetTopTwentyRarityHeroes {
  constructor(private stakeRankingHeroRepository: StakeRankingHeroRepository) {}
  async execute({ network, rarity }: IGetTopTwentyRarityHeroes) {
    if (rarity < 0 || rarity > 5) {
      throw new Error('Invalid rarity');
    }
    if (network !== WalletNetwork.BSC && network !== WalletNetwork.POLYGON) {
      throw new Error('Invalid network');
    }

    const list = await this.stakeRankingHeroRepository.getTopTwentyRarityHeroes(
      rarity,
      network,
    );

    const heroesIds = list.heroes.map((hero) => hero.heroId);

    const heroes = await getHeroesFromIds(heroesIds, network);

    const heroesMap = list.heroes.map((hero) => ({
      ...hero,
      hero: heroes.find(({ id }) => id.toString() === hero.heroId),
    }));
    list.heroes = heroesMap;

    return list;
  }
}
