import { WalletNetwork } from '@/database/models/Wallet';
import { MapRewardRepository } from '@/database/repositories/map-reward-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { validateEthereumAddress } from '@/utils/web3/check-wallet';
import { getHeroesFromGenIds } from '@/utils/web3/hero';
import { getHousesFromGenIds } from '@/utils/web3/house';
import { getWalletGenIds } from '@/utils/web3/wallet';
import { BadRequestException, Injectable } from '@nestjs/common';

interface IGetWallet {
  wallet: string;
  network: WalletNetwork;
}

@Injectable()
export class GetWallet {
  constructor(
    private walletRepository: WalletRepository,
    private mapRewardRepository: MapRewardRepository,
  ) {}
  async execute({ wallet, network }: IGetWallet) {
    if (!validateEthereumAddress(wallet)) {
      throw new BadRequestException('Invalid wallet address');
    }

    const walletEntity = await this.walletRepository.findOne({
      where: { walletId: wallet, network },
    });
    const genIds = await getWalletGenIds(wallet, network);

    const [heroes, houses, averageFarm] = await Promise.all([
      getHeroesFromGenIds(genIds.heroes, network),
      getHousesFromGenIds(genIds.houses),
      this.mapRewardRepository.getAverageRewardByWalletId(walletEntity?.id),
    ]);

    return {
      walletId: wallet,
      heroes,
      houses,
      tokens: genIds.tokens,
      wallet: walletEntity,
      averageFarm,
    };
  }
}
