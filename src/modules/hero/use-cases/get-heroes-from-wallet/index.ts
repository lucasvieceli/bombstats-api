import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { decodeIdHero, getHeroesFromGenIds } from '@/utils/web3/hero';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { FindOptionsRelationByString, FindOptionsRelations } from 'typeorm';

interface IGetHeroesFromGenIds {
  network: WalletNetwork;
  genIds: number[];
  wallet: string;
  relations?: FindOptionsRelations<Hero> | FindOptionsRelationByString;
}

@Injectable()
export class GetHeroesFromWallet {
  constructor(
    private heroRepository: HeroRepository,
    @InjectQueue('hero-update') private readonly heroUpdate: Queue,
  ) {}

  async execute({ network, genIds, relations, wallet }: IGetHeroesFromGenIds) {
    const cleanedGenId = genIds.filter((id) => id != 0);

    const heroesDb = await this.heroRepository.find({
      where: { wallet: wallet.toLowerCase(), network },
      relations,
    });

    this.checkUpdateHeroes(heroesDb, network);

    const differentGenIds = heroesDb.filter(
      (hero) =>
        !cleanedGenId.map((genId) => decodeIdHero(genId)).includes(hero.id),
    );

    const isEqual =
      differentGenIds.length === 0 && heroesDb.length === cleanedGenId.length;

    if (isEqual) {
      return heroesDb;
    }

    const heroes = await getHeroesFromGenIds(cleanedGenId as number[], network);

    return await this.heroRepository.updateOrInsertArray(
      heroes.map((hero) => {
        hero.wallet = wallet;
        return hero as unknown as Hero;
      }),
      network,
    );
  }

  async checkUpdateHeroes(heroes: Hero[], network: WalletNetwork) {
    const heroesToUpdate = heroes.filter(
      (hero) =>
        hero.updatedAt < new Date(Date.now() - 1000 * 60 * 60 * 6) &&
        !hero.burned,
    );

    if (heroesToUpdate.length > 0) {
      await this.heroUpdate.add('hero-update', {
        heroes: heroesToUpdate.map((hero) => hero.id),
        network,
      });
    }
  }
}
