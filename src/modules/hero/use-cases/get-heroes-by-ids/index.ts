import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { UpdateHeroesById } from '@/modules/hero/use-cases/update-heroes-by-id';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { FindOptionsRelationByString, FindOptionsRelations, In } from 'typeorm';

interface IGetHeroesByIds {
  network: WalletNetwork;
  ids: number[] | string[];
  relations?: FindOptionsRelations<Hero> | FindOptionsRelationByString;
}

@Injectable()
export class GetHeroesByIds {
  constructor(
    private heroRepository: HeroRepository,
    private updateHeroesById: UpdateHeroesById,
    @InjectQueue('hero-update') private readonly heroUpdate: Queue,
  ) {}

  async execute({ network, ids, relations }: IGetHeroesByIds) {
    try {
      const idsNumber = ids.map((id) => {
        const value = Number(id);

        if (isNaN(value)) {
          throw new BadRequestException('Invalid id');
        }

        return value;
      });

      let heroesDb = await this.heroRepository.find({
        where: { id: In(idsNumber), network },
        relations,
      });

      const notIncluded = idsNumber.filter(
        (id) => !heroesDb.map((hero) => hero.id).includes(id),
      );

      if (notIncluded.length > 0) {
        const newHeroes = await this.updateHeroesById.execute({
          ids: notIncluded,
          network,
        });

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

@Processor('hero-update', { concurrency: 2 })
export class HeroUpdateProcessor extends WorkerHost {
  constructor(private updateHeroesById: UpdateHeroesById) {
    super();
  }

  async process(
    data: Job<{ heroes: number[]; network: WalletNetwork }>,
  ): Promise<any> {
    Logger.log('hero update');
    try {
      await this.updateHeroesById.execute({
        ids: data.data.heroes,
        network: data.data.network,
      });
    } catch (e) {
      Logger.error(e);
    }
  }
}
