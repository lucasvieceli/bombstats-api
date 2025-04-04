import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { HeroUpdateQueue } from '@/modules/hero/processors/hero-update';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { QueueEvents } from 'bullmq';
import { FindOptionsRelationByString, FindOptionsRelations, In } from 'typeorm';

interface IGetHeroesByIds {
  network: WalletNetwork;
  ids: string[];
  relations?: FindOptionsRelations<Hero> | FindOptionsRelationByString;
}

@Injectable()
export class GetHeroesByIds {
  constructor(
    private heroRepository: HeroRepository,
    @InjectQueue('hero-update')
    private readonly heroUpdate: HeroUpdateQueue,
  ) {}

  async execute({ network, ids, relations }: IGetHeroesByIds) {
    try {
      ids.map((id) => {
        const value = Number(id);

        if (isNaN(value)) {
          throw new BadRequestException('Invalid id');
        }

        return value;
      });

      let heroesDb = await this.heroRepository.find({
        where: { id: In(ids), network },
        relations,
      });

      const notIncluded = ids.filter(
        (id) => !heroesDb.map((hero) => hero.id).includes(id as any),
      );

      if (notIncluded.length > 0) {
        const job = await this.heroUpdate.add(
          'hero-update',
          {
            heroes: notIncluded,
            network,
            returnValues: true,
          },
          { priority: 0 },
        );
        const queueEvents = new QueueEvents('hero-update');
        const newHeroes = await job.waitUntilFinished(queueEvents);

        heroesDb = heroesDb.concat(newHeroes);
      }
      this.checkUpdateHeroes(heroesDb, network);

      return heroesDb;
    } catch (e) {
      console.log('e', e);
      if (e.message.includes("Out of range value for column 'id' ")) {
        throw new BadRequestException('Invalid id');
      }

      throw e;
    }
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
