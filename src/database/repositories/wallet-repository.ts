import {
  DataSource,
  FindOptionsRelationByString,
  FindOptionsRelations,
  Repository,
} from 'typeorm';

import { Wallet, WalletNetwork, WalletStatus } from '@/database/models/Wallet';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletRepository extends Repository<Wallet> {
  constructor(private dataSource: DataSource) {
    super(Wallet, dataSource.createEntityManager());
  }

  async getWallet(walletId: string, network: WalletNetwork) {
    return this.findOne({
      where: { walletId: walletId.toLowerCase(), network },
    });
  }

  async findOrCreate(
    walletId: string,
    network: WalletNetwork,
    relations: FindOptionsRelations<Wallet> | FindOptionsRelationByString,
  ) {
    let wallet = await this.findOne({
      where: { walletId: walletId.toLowerCase(), network },
      relations,
    });

    if (!wallet) {
      wallet = this.create({
        walletId: walletId.toLowerCase(),
        online: WalletStatus.OFFLINE,
        extensionInstalled: false,
        network,
      });
      return await this.save(wallet);
    }

    return wallet;
  }

  async createOrUpdate(walletId: string, network: WalletNetwork) {
    let wallet = await this.findOne({
      where: { walletId: walletId.toLowerCase(), network },
    });

    if (!wallet) {
      wallet = this.create({
        walletId: walletId.toLowerCase(),
        online: WalletStatus.ONLINE,
        extensionInstalled: true,
        network,
      });
      return await this.save(wallet);
    }

    wallet.online = WalletStatus.ONLINE;
    wallet.extensionInstalled = true;
    return await this.save(wallet);
  }

  async getTotalOnline(network: WalletNetwork) {
    return this.count({
      where: { network, online: WalletStatus.ONLINE, extensionInstalled: true },
    });
  }

  async getTotalInstalled(network: WalletNetwork) {
    return this.count({ where: { network, extensionInstalled: true } });
  }
}
