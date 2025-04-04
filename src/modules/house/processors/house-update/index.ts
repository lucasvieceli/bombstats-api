import { House } from '@/database/models/House';
import { WalletNetwork } from '@/database/models/Wallet';
import { UpdateHousesById } from '@/modules/house/use-cases/update-houses-by-id';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

export type HouseUpdateJob = Job<
  {
    houses: string[];
    network: WalletNetwork;
    log?: boolean;
    additionalParamsHouse?: Partial<House>;
  },
  House[]
>;

export type HouseUpdateQueue = Queue<
  {
    houses: string[];
    network: WalletNetwork;
    log?: boolean;
    additionalParamsHouse?: Partial<House>;
  },
  House[]
>;

@Processor('house-update', { concurrency: 2 })
export class HouseUpdateProcessor extends WorkerHost {
  constructor(private updateHousesById: UpdateHousesById) {
    super();
  }

  async process(data: HouseUpdateJob): Promise<House[]> {
    Logger.debug(
      `house update ${data.data.houses.length}`,
      'HouseUpdateProcessor',
    );
    try {
      if (!data.data.houses.length) {
        return [];
      }
      return await this.updateHousesById.execute({
        ids: data.data.houses,
        network: data.data.network,
        additionalParamsHouse: data.data.additionalParamsHouse,
      });
    } catch (e) {
      Logger.error(e, 'HouseUpdateProcessor');
      throw e;
    }
  }
}
