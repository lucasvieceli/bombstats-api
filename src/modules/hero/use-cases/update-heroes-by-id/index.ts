import { Hero } from '@/database/models/Hero';
import { NftType, OpenSea } from '@/database/models/OpenSea';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { OpenSeaRepository } from '@/database/repositories/open-sea-repository';
import { getHeroesWithStakeOwnerFromIds } from '@/utils/web3/hero';
import { Injectable } from '@nestjs/common';

interface IUpdateHeroesById {
  network: WalletNetwork;
  ids: string[];
}

@Injectable()
export class UpdateHeroesById {
  constructor(
    private heroRepository: HeroRepository,
    private openSeaRepository: OpenSeaRepository,
  ) {}

  async execute({ network, ids }: IUpdateHeroesById) {
    const [heroes, opensea] = await Promise.all([
      getHeroesWithStakeOwnerFromIds(ids, network),
      network === WalletNetwork.POLYGON
        ? this.openSeaRepository.getByIds(ids, NftType.HERO)
        : ([] as OpenSea[]),
    ]);

    return await this.heroRepository.updateOrInsertArray(
      heroes.map((hero) => {
        const existsMarket = hero.market;
        const existsOpenSea = opensea.find((o) => o.nftId == hero.hero.id);

        return {
          ...(hero.hero as unknown as Hero),
          stake: hero.stake,
          wallet: hero.owner,
          updatedAt: new Date(),
          marketPrice: existsMarket ? hero.market.price : null,
          marketToken: existsMarket ? hero.market.tokenAddress : null,
          openSeaPrice: existsOpenSea ? existsOpenSea.amount : null,
        };
      }),
      network,
    );
  }
}
