import { Map } from '@/database/models/Map';
import { Wallet, WalletNetwork } from '@/database/models/Wallet';
import { MapBlockRepository } from '@/database/repositories/map-block-repository';
import { MapRepository } from '@/database/repositories/map-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { SocketService } from '@/services/websocket';
import { Injectable } from '@nestjs/common';

interface IOnGetMapBlock {
  wallet: string;
  network: WalletNetwork;
  value: any;
  additional: {
    reset: boolean;
  };
}

@Injectable()
export class OnGetMapBlock {
  constructor(
    private mapRepository: MapRepository,
    private walletRepository: WalletRepository,
    private mapBlockRepository: MapBlockRepository,
    private socketService: SocketService,
  ) {}
  async execute({ value, network, additional, wallet }: IOnGetMapBlock) {
    const walletEntity = await this.walletRepository.createOrUpdate(
      wallet,
      network,
    );
    if (!walletEntity) {
      return;
    }

    const map: Map = await this.getMap(walletEntity, additional);

    this.socketService.emitEventMapUpdate(walletEntity);

    const data = value.getUtfString('datas_pve_v2');
    const blocks = JSON.parse(data);

    await this.createBlocks(walletEntity, map, blocks);
  }

  async createBlocks(walletEntity: Wallet, map: Map, blocks: any) {
    await this.mapBlockRepository.deleteFromWalletId(walletEntity.id);
    return Promise.all(
      blocks.map(async (block: any) => {
        this.mapBlockRepository.save({
          map,
          mapId: map.id,
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

  async getMap(walletEntity: Wallet, additional: IOnGetMapBlock['additional']) {
    if (additional.reset) {
      this.socketService.emitEventMapReward(walletEntity, {
        resetMap: true,
      });
      return await this.mapRepository.save({
        wallet: walletEntity,
      });
    }

    return await this.mapRepository.getLastMap(walletEntity.id);
  }
}
