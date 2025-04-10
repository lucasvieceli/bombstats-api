import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { HouseRepository } from '@/database/repositories/house-repository';
import { UpdateHousesById } from '@/modules/house/use-cases/update-houses-by-id';
import { MessageFirebaseService } from '@/services/messageFireBase';
import { SocketService } from '@/services/websocket';
import { HOUSE_TYPE_MAP } from '@/utils/web3/house';
import { TOKENS_IDS_MAP } from '@/utils/web3/reward';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
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
export class OnHouseRetail extends WorkerHost implements OnModuleInit {
  constructor(
    private updateHousesById: UpdateHousesById,
    private socketService: SocketService,
    private houseRepository: HouseRepository,
    private messageFirebaseService: MessageFirebaseService,
  ) {
    super();
  }

  onModuleInit() {}

  async process(data: Job<IOnHouseRetail>): Promise<any> {
    const { id, amount, type, network, marketPlace, tokenAddress } = data.data;
    let token = tokenAddress;
    const additionalParamsHouse: Partial<House> = {};

    Logger.debug(`House ${id} ${type}`, 'OnHouseRetail');

    if (marketPlace === 'opensea') {
      if (type === 'listed') {
        additionalParamsHouse.openSeaPrice = amount;
      } else {
        additionalParamsHouse.openSeaPrice = null;
      }
    } else if (marketPlace === 'market') {
      if (type === 'sold') {
        const houseDb = await this.houseRepository.findOne({
          where: { id, network },
        });
        if (houseDb) {
          token = houseDb.marketToken;
        }
        additionalParamsHouse.openSeaPrice = null;
      }
    }
    const [house] = await this.updateHousesById.execute({
      ids: [id],
      network,
      additionalParamsHouse,
    });
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

    if (type === 'listed') {
      await this.sendPushNotification(data.data, house);
    }
  }

  async sendPushNotification(data: IOnHouseRetail, house: House) {
    const network = data.network;
    const topic = `notifications-retail-${network.toLowerCase()}`;
    const nameToken = TOKENS_IDS_MAP[data.tokenAddress];

    const detailHouse = HOUSE_TYPE_MAP[house.rarity];

    await this.messageFirebaseService.sendMessageToTopic(topic, {
      title: `🚀 New House ${detailHouse.name} ${network} 🚀`,
      body: `💵 Price: ${data.amount} ${nameToken}`,
      icon: detailHouse.image,
      url: `https://bombstats.com/${network.toLowerCase()}/house/${house.id}`,
    });
  }
}
