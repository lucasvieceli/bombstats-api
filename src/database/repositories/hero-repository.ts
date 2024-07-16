import { DataSource, Repository } from 'typeorm';

import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
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
      throw new Error('Both id and network must be set in the hero entity');
    }

    await this.upsert(hero, ['id', 'network']);

    return hero;
  }
  async updateOrInsertArray(heroData: Hero[], network: WalletNetwork) {
    const heroes = heroData
      .map((h) => {
        const hero = new Hero();
        hero.network = network;

        Object.assign(hero, h); // Assign properties from heroData to the new Hero instance

        if (!hero.id || !hero.network) {
          return null;
        }
        return hero;
      })
      .filter((hero) => hero !== null);

    const heroesToUpsert = heroes.map((hero) => ({ ...hero }));

    await this.upsert(heroesToUpsert, ['id', 'network']);

    return heroes;
  }

  // async getHeroesFromIds(ids: number[] | string[], network: WalletNetwork) {
  //   const idsNumber = ids.map((id) => Number(id));

  //   let heroesDb = await this.find({
  //     where: { id: In(idsNumber), network },
  //   });

  //   const notIncluded = idsNumber.filter(
  //     (id) => !heroesDb.map((hero) => hero.id).includes(id),
  //   );

  //   if (notIncluded.length > 0) {
  //     const newHeroes = await this.updateHeroesFromIds(notIncluded, network);

  //     heroesDb = heroesDb.concat(newHeroes);
  //   }

  //   this.checkUpdateHeroes(heroesDb, network);

  //   return heroesDb;
  // }
}
