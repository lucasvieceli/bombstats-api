import { WalletNetwork } from '@/database/models/Wallet';
import { FarmSessionRepository } from '@/database/repositories/farm-session-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { Injectable } from '@nestjs/common';

interface IOnStopPve {
  wallet: string;
  network: WalletNetwork;
}

@Injectable()
export class OnStopPve {
  constructor(
    private farmSessionRepository: FarmSessionRepository,
    private walletRepository: WalletRepository,
  ) {}
  async execute({ wallet, network }: IOnStopPve) {
    const walletValue = await this.walletRepository.getWallet(wallet, network);

    if (!walletValue) {
      return;
    }

    await this.farmSessionRepository.stopLastSession(walletValue.id);
  }
}
