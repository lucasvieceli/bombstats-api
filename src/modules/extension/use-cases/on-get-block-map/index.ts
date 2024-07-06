import { Wallet, WalletNetwork } from '@/database/models/Wallet';
import { MapBlockRepository } from '@/database/repositories/map-block-repository';
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
    private mapBlockRepository: MapBlockRepository,
    private socketService: SocketService,
  ) {}

  async executeV2({ network, additional, wallet }: IOnGetMapBlock) {
    const walletEntity = await this.walletRepository.getWallet(wallet, network);
    if (!walletEntity) {
      return;
    }

    await this.createMap(walletEntity, additional);

    const blocks = additional.blocks;

    await this.createBlocks(walletEntity, blocks);
    await this.socketService.emitEventCurrentMap(walletEntity);
  }

  async createBlocks(walletEntity: Wallet, blocks: any) {
    await this.mapBlockRepository.deleteFromWalletId(walletEntity.id);
    return Promise.all(
      blocks.map(async (block: any) => {
        this.mapBlockRepository.save({
          wallet: walletEntity,
          type: block.type,
          i: block.i,
          j: block.j,
          maxHp: block.maxHp,
          hp: block.hp,
        });
      }),
    );
  }

  async createMap(
    walletEntity: Wallet,
    additional: IOnGetMapBlock['additional'],
  ) {
    if (additional.reset) {
      this.socketService.emitEventMapReward(walletEntity, {
        resetMap: true,
      });
      return await this.mapRepository.save({
        wallet: walletEntity,
      });
    }
  }
}
