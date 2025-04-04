import { Hero } from '@/database/models/Hero';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { HeroUpdateQueue } from '@/modules/hero/processors/hero-update';
import { MessageFirebaseService } from '@/services/messageFireBase';
import { SocketService } from '@/services/websocket';
import { parseHeroSkinImage } from '@/utils/web3/hero';
import { NAMES_TOKENS_IDS_MAP, TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, QueueEvents } from 'bullmq';

export interface IOnHeroRetail {
  id: string;
  amount: number;
  type: 'sold' | 'listed';
  network: WalletNetwork;
  tokenAddress?: string;
  marketPlace: 'opensea' | 'market';
}

@Processor('on-hero-retail', { concurrency: 10 })
export class OnHeroRetail extends WorkerHost implements OnModuleInit {
  constructor(
    private messageFirebaseService: MessageFirebaseService,
    private socketService: SocketService,
    private heroRepository: HeroRepository,
    @InjectQueue('hero-update') private readonly heroUpdate: HeroUpdateQueue,
  ) {
    super();
  }

  onModuleInit() {}

  async process(data: Job<IOnHeroRetail>): Promise<any> {
    const { id, amount, type, network, marketPlace, tokenAddress } = data.data;

    let token = tokenAddress;
    Logger.debug(`Hero ${id} ${type} ${network}`, 'OnHeroRetail');
    const additionalParamsHero: Partial<Hero> = {};

    if (marketPlace === 'opensea') {
      token = NAMES_TOKENS_IDS_MAP.MATIC;
      if (type === 'listed') {
        additionalParamsHero.openSeaPrice = amount;
      } else {
        additionalParamsHero.openSeaPrice = null;
        additionalParamsHero.marketPrice = null;
        additionalParamsHero.marketToken = null;
      }
    } else if (marketPlace === 'market') {
      if (type === 'sold') {
        const heroDb = await this.heroRepository.findOne({
          where: { id, network },
        });
        if (heroDb) {
          token = heroDb.marketToken;
        }
        additionalParamsHero.openSeaPrice = null;
        additionalParamsHero.marketPrice = null;
        additionalParamsHero.marketToken = null;
      }
    }

    const job = await this.heroUpdate.add(
      'hero-update',
      {
        heroes: [id],
        network,
        returnValues: true,
        additionalParamsHero,
      },
      { priority: 0 },
    );
    const queueEvents = new QueueEvents('hero-update');
    const [hero] = await job.waitUntilFinished(queueEvents);

    const dataSend = {
      hero,
      type,
      soldPrice: type === 'sold' ? amount : undefined,
      tokenAddress: token,
      marketPlace,
    };
    this.socketService.emitRetail(dataSend, network);

    if (type === 'listed') {
      await this.sendPushNotification(data.data, hero);
    }
  }

  async sendPushNotification(data: IOnHeroRetail, hero: Hero) {
    const topic = `notifications-retail-${data.network.toLowerCase()}`;
    const nameToken = TOKENS_IDS_MAP[data.tokenAddress];

    await this.messageFirebaseService.sendMessageToTopic(topic, {
      title: `🚀 New Hero ${hero.rarity} ${data.network} 🚀`,
      body: `💵 Price: ${data.amount} ${nameToken}\n\n💪 ${hero.strength + Math.max(hero.level - 1, 0)} 👟 ${hero.speed} ⚡️ ${hero.stamina}`,
      icon: parseHeroSkinImage(hero.skinValue, hero.variant),
      url: `https://bombstats.com/${data.network.toLowerCase()}/hero/${hero.id}`,
    });
  }
}
