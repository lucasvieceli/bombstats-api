import { WalletNetwork } from '@/database/models/Wallet';
import { GetHousesByIds } from '@/modules/house/use-cases/get-houses-by-ids';
import { Injectable } from '@nestjs/common';

interface IGetHouse {
  network: WalletNetwork;
  id: string;
}

@Injectable()
export class GetHouse {
  constructor(private getHousesByIds: GetHousesByIds) {}

  async execute({ network, id }: IGetHouse) {
    const [house] = await this.getHousesByIds.execute({
      network,
      ids: [id],
    });

    return house;
  }
}
