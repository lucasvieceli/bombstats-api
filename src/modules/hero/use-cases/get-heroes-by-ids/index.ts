import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { In } from 'typeorm';

interface IGetHeroesByIds {
  network: WalletNetwork;
  ids: number[] | string[];
}

@Injectable()
export class GetHeroesByIds {
  constructor(
    private heroRepository: HeroRepository,
    @InjectQueue('hero-update') private readonly heroUpdate: Queue,
  ) {}

  async execute({ network, ids }: IGetHeroesByIds) {
    const idsNumber = ids.map((id) => Number(id));

    let heroesDb = await this.heroRepository.find({
      where: { id: In(idsNumber), network },
    });

    const notIncluded = idsNumber.filter(
      (id) => !heroesDb.map((hero) => hero.id).includes(id),
    );

    if (notIncluded.length > 0) {
      const newHeroes = await this.heroRepository.updateHeroesFromIds(
        notIncluded,
        network,
      );

      heroesDb = heroesDb.concat(newHeroes);
    }

    this.checkUpdateHeroes(heroesDb, network);

    return heroesDb;
  }

  async checkUpdateHeroes(heroes: Hero[], network: WalletNetwork) {
    const heroesToUpdate = heroes.filter(
      (hero) => hero.updatedAt < new Date(Date.now() - 1000 * 60 * 60 * 6),
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
  constructor(private heroRepository: HeroRepository) {
    super();
  }

  async process(
    data: Job<{ heroes: number[]; network: WalletNetwork }>,
  ): Promise<any> {
    Logger.log('hero update');
    try {
      await this.heroRepository.updateHeroesFromIds(
        data.data.heroes,
        data.data.network,
      );
    } catch (e) {
      Logger.error(e);
    }
  }
}
