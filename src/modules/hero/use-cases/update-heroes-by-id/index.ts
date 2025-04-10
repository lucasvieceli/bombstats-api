import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { getHeroesWithStakeOwnerFromIds } from '@/utils/web3/hero';
import { Injectable } from '@nestjs/common';

interface IUpdateHeroesById {
  network: WalletNetwork;
  ids: string[];
  log?: boolean;
  returnValues?: boolean;
  additionalParamsHero?: Partial<Hero>;
}

@Injectable()
export class UpdateHeroesById {
  constructor(private heroRepository: HeroRepository) {}

  async execute({
    network,
    ids,
    log = false,
    additionalParamsHero,
  }: IUpdateHeroesById) {
    const heroes = await getHeroesWithStakeOwnerFromIds(ids, network, log);

    return await this.heroRepository.updateOrInsertArray(
      heroes.map((hero) => {
        const existsMarket = hero.market;

        return {
          ...(hero.hero as unknown as Hero),
          stake: hero.stake,
          stakeSen: hero.stakeSen,
          wallet: hero.owner,
          updatedAt: new Date(),
          marketPrice: existsMarket ? hero.market.price : null,
          marketToken: existsMarket
            ? hero.market.tokenAddress.toLowerCase()
            : null,
          ...additionalParamsHero,
        };
      }),
      network,
    );

    // if (returnValues) {
    //   return await this.heroRepository.find({
    //     where: { id: In(heroes.map((hero) => hero.hero.id)), network },
    //     relations: ['heroSales'],
    //   });
    // }
  }
}
