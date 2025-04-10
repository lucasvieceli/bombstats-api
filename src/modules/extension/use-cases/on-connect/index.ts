import { WalletNetwork } from '@/database/models/Wallet';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { Injectable } from '@nestjs/common';

interface IOnConnect {
  wallet: string;
  network: WalletNetwork;
}

@Injectable()
export class OnConnect {
  constructor(private walletRepository: WalletRepository) {}
  async execute({ wallet, network }: IOnConnect) {
    await this.walletRepository.createOrUpdate(wallet, network);
  }
}
