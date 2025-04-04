import { WalletNetwork } from '@/database/models/Wallet';
import { MapRepository } from '@/database/repositories/map-repository';
import { MapRewardRepository } from '@/database/repositories/map-reward-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { SocketService } from '@/services/websocket';
import { Injectable } from '@nestjs/common';

interface IOnStartExplodeV4 {
  wallet: string;
  network: WalletNetwork;
  additional: any;
}

@Injectable()
export class OnStartExplodeV4 {
  constructor(
    private walletRepository: WalletRepository,
    private mapRewardRepository: MapRewardRepository,
    private mapRepository: MapRepository,
    private socketService: SocketService,
  ) {}
  async executeV2({ wallet, additional, network }: IOnStartExplodeV4) {
    const blocks = additional?.blocks;
    this.socketService.emitEventWallet(
      'START_EXPLODE_V4',
      wallet,
      network,
      additional,
    );

    if (!blocks) return;

    await this.executeBlocks(wallet, network, blocks);
  }

  async executeBlocks(wallet: string, network: WalletNetwork, blocks: any) {
    // let map = null;
    // let walletEntity = null;
    // //check has one of blocks rewards
    // if (blocks.some((block) => block.rewards.length > 0)) {
    //   walletEntity = await this.walletRepository.getWallet(wallet, network);
    //   if (!walletEntity) {
    //     return;
    //   }
    //   map = await this.mapRepository.getLastMap(walletEntity.id);
    // }
    // await Promise.allSettled(
    //   blocks.map(async (block) => {
    //     if (block?.rewards?.length && walletEntity) {
    //       await Promise.all(
    //         block.rewards.map(async (reward) => {
    //           this.mapRewardRepository.insertReward({
    //             wallet: walletEntity,
    //             type: reward.type,
    //             value: reward.value,
    //             map,
    //             walletId: walletEntity.id,
    //           });
    //         }),
    //       );
    //     }
    //   }),
    // );
  }
}
