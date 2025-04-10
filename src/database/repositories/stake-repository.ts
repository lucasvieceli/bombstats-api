import { DataSource, Repository } from 'typeorm';

import { Stake } from '@/database/models/Stake';
import { WalletNetwork } from '@/database/models/Wallet';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StakeRepository extends Repository<Stake> {
  constructor(private dataSource: DataSource) {
    super(Stake, dataSource.createEntityManager());
  }

  async getStakesByWallet(wallet: string, network: WalletNetwork) {
    return this.find({
      select: {
        amount: true,
        date: true,
        withdraw: true,
        token: true,
        heroId: true,
        rarity: true,
      },
      where: { wallet, network },
      take: 20,
      order: { date: 'DESC' },
    });
  }

  async getHeroes(network: WalletNetwork): Promise<Stake[]> {
    return this.createQueryBuilder()
      .select('DISTINCT heroId')
      .where('network = :network', { network })
      .andWhere('rarity IS NOT NULL')
      .getRawMany();
  }
}
