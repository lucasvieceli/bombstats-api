import { NftType } from '@/database/models/OpenSea';
import { WalletNetwork } from '@/database/models/Wallet';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { OpenSeaRepository } from '@/database/repositories/open-sea-repository';
import { UpdateHeroesById } from '@/modules/hero/use-cases/update-heroes-by-id';
import { SocketService } from '@/services/websocket';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

interface IOnHeroRetail {
  id: string;
  amount: number;
  type: 'sold' | 'listed';
  network: WalletNetwork;
  tokenAddress?: string;
  marketPlace: 'opensea' | 'market';
}

@Processor('on-hero-retail', { concurrency: 10 })
export class OnHeroRetail extends WorkerHost {
  constructor(
    private updateHeroesById: UpdateHeroesById,
    private openSeaRepository: OpenSeaRepository,
    private socketService: SocketService,
    private heroRepository: HeroRepository,
  ) {
    super();
  }

  async process(data: Job<IOnHeroRetail>): Promise<any> {
    const { id, amount, type, network, marketPlace, tokenAddress } = data.data;

    let token = tokenAddress;
    Logger.debug(`Hero ${id} ${type}`, 'OnHeroRetail');

    if (marketPlace === 'opensea') {
      if (type === 'listed') {
        await this.openSeaRepository.updateOrInsert({
          amount,
          nftId: id,
          nftType: NftType.HERO,
        });
      } else {
        await this.openSeaRepository.delete({
          nftId: id,
          nftType: NftType.HERO,
        });
      }
    }
    if (type === 'sold') {
      if (marketPlace === 'opensea') {
        token = NAMES_TOKENS_IDS_MAP.MATIC;
      } else {
        const heroDb = await this.heroRepository.findOne({
          where: { id, network },
        });
        if (heroDb) {
          token = heroDb.marketToken;
        }
      }
    }
    const [hero] = await this.updateHeroesById.execute({ ids: [id], network });
    this.socketService.emitRetail(
      {
        hero,
        type,
        soldPrice: type === 'sold' ? amount : undefined,
        tokenAddress: token,
        marketPlace,
      },
      network,
    );
  }
}
