import { DataSource, In, Repository } from 'typeorm';

import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { getHeroesFromGenIds } from '@/utils/web3/hero';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HeroRepository extends Repository<Hero> {
  constructor(private dataSource: DataSource) {
    super(Hero, dataSource.createEntityManager());
  }

  async updateOrInsert(heroData: Hero, network: WalletNetwork) {
    const hero = new Hero();
    hero.network = network;

    Object.assign(hero, heroData); // Assign properties from heroData to the new Hero instance

    if (!hero.id || !hero.network) {
      console.log(heroData, 'aki');
      throw new Error('Both id and network must be set in the hero entity');
    }

    await this.upsert(hero, ['id', 'network']);

    return hero;
  }

  async getHeroesFromGenId(
    genId: number[],
    network: WalletNetwork,
    wallet: string,
  ) {
    const cleanedGenId = genId.filter((id) => id != 0);

    const heroesDb = await this.find({
      where: { genId: In(cleanedGenId), network },
    });

    if (heroesDb.length === genId.length) {
      return heroesDb;
    }

    const heroes = await getHeroesFromGenIds(cleanedGenId, network);

    return await Promise.all(
      heroes.map(async (hero) => {
        hero.wallet = wallet;
        return this.updateOrInsert(hero as unknown as Hero, network);
      }),
    );
  }
}
