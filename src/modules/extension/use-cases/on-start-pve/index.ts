import { WalletNetwork } from '@/database/models/Wallet';
import { FarmSessionRepository } from '@/database/repositories/farm-session-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { SocketService } from '@/services/websocket';
import { Injectable } from '@nestjs/common';

interface IOnStartPve {
  wallet: string;
  network: WalletNetwork;
}

@Injectable()
export class OnStartPve {
  constructor(
    private farmSessionRepository: FarmSessionRepository,
    private walletRepository: WalletRepository,
    private socketService: SocketService,
  ) {}
  async execute({ wallet, network }: IOnStartPve) {
    const walletValue = await this.walletRepository.getWallet(wallet, network);

    if (!walletValue) {
      return;
    }

    await this.farmSessionRepository.save({
      wallet: walletValue,
      startTime: new Date(),
    });
    // this.socketService.emitEventCurrentMap(walletValue);
  }
}
