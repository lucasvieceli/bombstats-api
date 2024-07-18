import { NftType } from '@/database/models/OpenSea';
import { WalletNetwork } from '@/database/models/Wallet';
import { HouseRepository } from '@/database/repositories/house-repository';
import { OpenSeaRepository } from '@/database/repositories/open-sea-repository';
import { UpdateHousesById } from '@/modules/house/use-cases/update-houses-by-id';
import { SocketService } from '@/services/websocket';
import { NAMES_TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

interface IOnHouseRetail {
  id: string;
  amount: number;
  type: 'sold' | 'listed';
  network: WalletNetwork;
  tokenAddress?: string;
  marketPlace: 'opensea' | 'market';
}

@Processor('on-house-retail', { concurrency: 10 })
export class OnHouseRetail extends WorkerHost {
  constructor(
    private updateHousesById: UpdateHousesById,
    private openSeaRepository: OpenSeaRepository,
    private socketService: SocketService,
    private houseRepository: HouseRepository,
  ) {
    super();
  }

  async process(data: Job<IOnHouseRetail>): Promise<any> {
    const { id, amount, type, network, marketPlace, tokenAddress } = data.data;
    let token = tokenAddress;
    Logger.debug(`House ${id} ${type}`, 'OnHouseRetail');

    if (marketPlace === 'opensea') {
      if (type === 'listed') {
        await this.openSeaRepository.updateOrInsert({
          amount,
          nftId: id,
          nftType: NftType.HOUSE,
        });
      } else {
        token = NAMES_TOKENS_IDS_MAP.MATIC;
        await this.openSeaRepository.delete({
          nftId: id,
          nftType: NftType.HOUSE,
        });
      }
    } else {
      if (type === 'sold') {
        const houseDb = await this.houseRepository.findOne({
          where: { id, network },
        });
        if (houseDb) {
          token = houseDb.marketToken;
        }
      }
    }

    const [house] = await this.updateHousesById.execute({ ids: [id], network });
    this.socketService.emitRetail(
      {
        house,
        type,
        soldPrice: type === 'sold' ? amount : undefined,
        tokenAddress: token,
        marketPlace,
      },
      network,
    );
  }
}
