import { WalletNetwork } from '@/database/models/Wallet';
import { GetHeroesByIds } from '@/modules/hero/use-cases/get-heroes-by-ids';
import { Injectable } from '@nestjs/common';

interface IGetHero {
  network: WalletNetwork;
  id: string;
}

@Injectable()
export class GetHero {
  constructor(private getHeroesByIds: GetHeroesByIds) {}

  async execute({ network, id }: IGetHero) {
    const [hero] = await this.getHeroesByIds.execute({
      network,
      ids: [id],
      relations: ['stakes', 'stakeRankingHero'],
    });

    return hero;
  }
}
