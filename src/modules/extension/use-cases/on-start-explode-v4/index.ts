import { Wallet, WalletNetwork } from '@/database/models/Wallet';
import { MapBlockRepository } from '@/database/repositories/map-block-repository';
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
    private mapBlockRepository: MapBlockRepository,
    private mapRewardRepository: MapRewardRepository,
    private mapRepository: MapRepository,
    private socketService: SocketService,
  ) {}
  async execute({ wallet, value, network }: any) {
    const walletEntity = await this.walletRepository.createOrUpdate(
      wallet,
      network,
    );
    if (!walletEntity) {
      return;
    }
    const blocks = await this.getBlocks(value);
    await this.executeBlocks(walletEntity, blocks);
    this.socketService.emitEventMapUpdate(walletEntity, { blocks });
  }
  async executeV2({ wallet, additional, network }: IOnStartExplodeV4) {
    const walletEntity = await this.walletRepository.getWallet(wallet, network);
    if (!walletEntity) {
      return;
    }
    const blocks = additional?.blocks;
    if (!blocks) return;
    this.socketService.emitEventMapUpdate(walletEntity, { blocks });

    await this.executeBlocks(walletEntity, blocks);
  }

  async getBlocks(value: any) {
    const rawEnemies = value.getSFSArray('blocks');
    const blocks = Array(rawEnemies?.size() || 0)
      .fill(null)
      .map((_, i) => {
        const enemy = rawEnemies.getSFSObject(i);
        const dataRewards = enemy.getSFSArray('rewards');

        let rewards: any[] = [];
        if (dataRewards) {
          rewards = Array(dataRewards.size())
            .fill(null)
            .map((_, i) => {
              const payloadReward = dataRewards.getSFSObject(i);
              return {
                type: payloadReward.getUtfString('type'),
                value: payloadReward.getFloat('value'),
              };
            });
        }

        return {
          hp: enemy.getInt('hp'),
          i: enemy.getInt('i'),
          j: enemy.getInt('j'),
          rewards,
        };
      });

    return blocks;
  }

  async executeBlocks(wallet: Wallet, blocks: any) {
    let map = null;
    //check has one of blocks rewards
    if (blocks.some((block) => block.rewards.length > 0)) {
      map = await this.mapRepository.getLastMap(wallet.id);
    }

    await Promise.allSettled(
      blocks.map(async (block) => {
        this.mapBlockRepository.updateBlock(
          wallet.id,
          block.i,
          block.j,
          block.hp,
        );
        if (block?.rewards?.length) {
          await Promise.all(
            block.rewards.map(async (reward) => {
              this.socketService.emitEventMapReward(wallet, {
                block: {
                  type: reward.type,
                  value: reward.value,
                },
              });
              await this.mapRewardRepository.save({
                wallet,
                type: reward.type,
                value: reward.value,
                map,
                walletId: wallet.id,
              });
            }),
          );
        }
      }),
    );
  }
}
