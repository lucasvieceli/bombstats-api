import { Wallet, WalletNetwork } from '@/database/models/Wallet';
import { MapRepository } from '@/database/repositories/map-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { SocketService } from '@/services/websocket';
import { Injectable } from '@nestjs/common';

interface IOnGetMapBlock {
  wallet: string;
  network: WalletNetwork;
  additional: any;
}

@Injectable()
export class OnGetMapBlock {
  constructor(
    private mapRepository: MapRepository,
    private walletRepository: WalletRepository,
    private socketService: SocketService,
  ) {}

  async executeV2({ network, additional, wallet }: IOnGetMapBlock) {
    const walletEntity = await this.walletRepository.getWallet(wallet, network);
    if (!walletEntity) {
      return;
    }

    await this.createMap(walletEntity, additional);

    this.socketService.emitEventWallet(
      'GET_BLOCK_MAP',
      wallet,
      network,
      additional,
    );
  }

  async createMap(
    walletEntity: Wallet,
    additional: IOnGetMapBlock['additional'],
  ) {
    if (additional.reset) {
      return await this.mapRepository.save({
        wallet: walletEntity,
      });
    }
  }
}
