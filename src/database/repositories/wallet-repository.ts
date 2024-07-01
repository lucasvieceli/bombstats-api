import { DataSource, Repository } from 'typeorm';

import { Wallet, WalletNetwork, WalletStatus } from '@/database/models/Wallet';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletRepository extends Repository<Wallet> {
  constructor(private dataSource: DataSource) {
    super(Wallet, dataSource.createEntityManager());
  }

  async createOrUpdate(walletId: string, network: WalletNetwork) {
    let wallet = await this.findOne({
      where: { walletId: walletId.toLowerCase(), network },
    });

    if (!wallet) {
      wallet = this.create({
        walletId: walletId.toLowerCase(),
        online: WalletStatus.ONLINE,
        network,
      });
      return await this.save(wallet);
    }

    wallet.online = WalletStatus.ONLINE;
    return await this.save(wallet);
  }
}
