import { WalletNetwork } from '@/database/models/Wallet';
import { FarmAverageRepository } from '@/database/repositories/farm-average-repository';
import { StakeRepository } from '@/database/repositories/stake-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { GetHeroesFromWallet } from '@/modules/hero/use-cases/get-heroes-from-wallet';
import { GetHousesFromWallet } from '@/modules/house/use-cases/get-houses-from-wallet';
import { SocketService } from '@/services/websocket';
import { validateEthereumAddress } from '@/utils/web3/check-wallet';
import { getWalletGenIds } from '@/utils/web3/wallet';
import { BadRequestException, Injectable } from '@nestjs/common';
import { differenceInHours } from 'date-fns';

interface IGetWallet {
  wallet: string;
  network: WalletNetwork;
}

@Injectable()
export class GetWallet {
  constructor(
    private walletRepository: WalletRepository,
    private farmAverageRepository: FarmAverageRepository,
    private stakeRepository: StakeRepository,
    private socketService: SocketService,
    private getHeroesFromWallet: GetHeroesFromWallet,
    private getHousesFromWallet: GetHousesFromWallet,
  ) {}
  async execute({ wallet, network }: IGetWallet) {
    if (!validateEthereumAddress(wallet)) {
      throw new BadRequestException('Invalid wallet address');
    }
    if (
      wallet.toLowerCase() ==
      '0xe2d20d8223032C8EBD052B970C19889161bD4401'.toLowerCase()
    ) {
      console.log('wallet antes');
    }
    const walletEntity = await this.walletRepository.findOrCreate(
      wallet,
      network,
      [
        'stakeRankingWallet',
        'claimRankingWallet',
        'farmAverage',
        'stakeRankingWalletGlobal',
      ],
    );

    const lastUpdateFarmAverage = walletEntity?.farmAverage?.updatedAt;
    if (
      !lastUpdateFarmAverage ||
      differenceInHours(new Date(), lastUpdateFarmAverage) >= 1
    ) {
      walletEntity.farmAverage =
        await this.farmAverageRepository.createAverageRewardByWalletId(
          walletEntity?.id,
        );
    }

    if (
      wallet.toLowerCase() ==
      '0xe2d20d8223032C8EBD052B970C19889161bD4401'.toLowerCase()
    ) {
      console.log('genIds antes');
    }
    const genIds = await getWalletGenIds(wallet, network);

    if (
      wallet.toLowerCase() ==
      '0xe2d20d8223032C8EBD052B970C19889161bD4401'.toLowerCase()
    ) {
      console.log('genIds', genIds);
    }

    const [heroes, houses, stakes] = await Promise.all([
      this.getHeroesFromWallet.execute({
        genIds: genIds.heroes,
        network,
        wallet,
      }),
      this.getHousesFromWallet.execute({
        genIds: genIds.houses,
        network,
        wallet,
      }),
      this.stakeRepository.getStakesByWallet(wallet, network),
    ]);

    return {
      walletId: wallet,
      online: this.socketService.walletConnected(wallet, network),
      wallet: walletEntity,
      heroes,
      houses,
      tokens: genIds.tokens,
      stakes,
    };
  }
}
