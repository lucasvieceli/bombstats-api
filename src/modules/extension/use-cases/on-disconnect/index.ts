import { WalletNetwork, WalletStatus } from '@/database/models/Wallet';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { OnStopPve } from '@/modules/extension/use-cases/on-stop-pve';
import { Injectable } from '@nestjs/common';

interface IOnDisconnect {
  wallet: string;
  network: WalletNetwork;
}

@Injectable()
export class OnDisconnect {
  constructor(
    private walletRepository: WalletRepository,
    private onStopPve: OnStopPve,
  ) {}
  async execute({ wallet, network }: IOnDisconnect) {
    let walletEntity = await this.walletRepository.findOne({
      where: { walletId: wallet.toLocaleLowerCase(), network },
    });

    if (!walletEntity) {
      walletEntity = this.walletRepository.create({
        walletId: wallet.toLocaleLowerCase(),
        online: WalletStatus.OFFLINE,
      });
      return await this.walletRepository.save(walletEntity);
    }
    await this.onStopPve.execute({ wallet, network });

    await this.walletRepository.save(walletEntity);
  }
}
