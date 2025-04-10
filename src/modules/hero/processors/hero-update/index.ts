import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { UpdateHeroesById } from '@/modules/hero/use-cases/update-heroes-by-id';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

export type HeroUpdateJob = Job<
  {
    heroes: string[];
    network: WalletNetwork;
    log?: boolean;
    returnValues?: boolean;
    additionalParamsHero?: Partial<Hero>;
  },
  Hero[]
>;

export type HeroUpdateQueue = Queue<
  {
    heroes: string[];
    network: WalletNetwork;
    log?: boolean;
    returnValues?: boolean;
    additionalParamsHero?: Partial<Hero>;
  },
  Hero[]
>;

@Processor('hero-update', { concurrency: 3 })
export class HeroUpdateProcessor extends WorkerHost {
  constructor(private updateHeroesById: UpdateHeroesById) {
    super();
  }

  async process(data: HeroUpdateJob): Promise<Hero[]> {
    Logger.debug(
      `hero update ${data.data.heroes.length}`,
      `HeroUpdateProcessor ${data.data.network}`,
    );

    if (!data.data.heroes.length) {
      return [];
    }

    try {
      return await this.updateHeroesById.execute({
        ids: data.data.heroes,
        network: data.data.network,
        log: data.data.log,
        returnValues: data.data.returnValues,
        additionalParamsHero: data.data.additionalParamsHero,
      });
    } catch (e) {
      Logger.error(`${e.message}`, 'HeroUpdateProcessor');
      throw e;
    }
  }
}
