import { ClaimToken } from '@/database/models/Claim';
import { WalletNetwork } from '@/database/models/Wallet';
import { ClaimRankingWalletRepository } from '@/database/repositories/claim-ranking-wallet-repository';
import { FarmAverageRepository } from '@/database/repositories/farm-average-repository';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { StakeRepository } from '@/database/repositories/stake-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { validateEthereumAddress } from '@/utils/web3/check-wallet';
import { getHousesFromGenIds } from '@/utils/web3/house';
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
    private claimRankingWalletRepository: ClaimRankingWalletRepository,
    private heroRepository: HeroRepository,
  ) {}
  async execute({ wallet, network }: IGetWallet) {
    if (!validateEthereumAddress(wallet)) {
      throw new BadRequestException('Invalid wallet address');
    }
    if (
      wallet.toLowerCase() ==
      '0xFE356c63D90BEA7800328283821d3BeD81760925'.toLowerCase()
    ) {
      console.log('wallet antes');
    }
    const walletEntity = await this.walletRepository.findOrCreate(
      wallet,
      network,
      ['stakeRankingWallet', 'claimRankingWallet', 'farmAverage'],
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
      '0xFE356c63D90BEA7800328283821d3BeD81760925'.toLowerCase()
    ) {
      console.log('genIds antes');
    }
    const genIds = await getWalletGenIds(wallet, network);

    if (
      wallet.toLowerCase() ==
      '0xFE356c63D90BEA7800328283821d3BeD81760925'.toLowerCase()
    ) {
      console.log('genIds', genIds);
    }

    const [heroes, houses, averageFarm, stakes, claimRanking] =
      await Promise.all([
        this.heroRepository.getHeroesFromGenId(genIds.heroes, network, wallet),
        getHousesFromGenIds(genIds.houses),
        new Promise((resolve) => {
          resolve(null);
        }),
        // this.mapRewardRepository.getAverageRewardByWalletId(walletEntity?.id),
        this.stakeRepository.getStakesByWallet(wallet, network),
        this.claimRankingWalletRepository.getPositionRanking(
          wallet,
          network,
          ClaimToken.BCOIN,
        ),
      ]);

    return {
      walletId: wallet,
      wallet: walletEntity,
      heroes,
      houses,
      tokens: genIds.tokens,
      averageFarm,
      claimRanking,
      stakes,
    };
  }
}
