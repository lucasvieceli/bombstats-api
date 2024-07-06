import { ClaimToken } from '@/database/models/Claim';
import { WalletNetwork } from '@/database/models/Wallet';
import { ClaimRankingWalletRepository } from '@/database/repositories/claim-ranking-wallet-repository';
import { HeroRepository } from '@/database/repositories/hero-repository';
import { MapRewardRepository } from '@/database/repositories/map-reward-repository';
import { StakeRankingWalletRepository } from '@/database/repositories/stake-ranking-wallet';
import { StakeRepository } from '@/database/repositories/stake-repository';
import { WalletRepository } from '@/database/repositories/wallet-repository';
import { validateEthereumAddress } from '@/utils/web3/check-wallet';
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
    private stakeRankingWalletRepository: StakeRankingWalletRepository,
    private stakeRepository: StakeRepository,
    private claimRankingWalletRepository: ClaimRankingWalletRepository,
    private heroRepository: HeroRepository,
  ) {}
  async execute({ wallet, network }: IGetWallet) {
    if (!validateEthereumAddress(wallet)) {
      throw new BadRequestException('Invalid wallet address');
    }

    const walletEntity = await this.walletRepository.findOne({
      where: { walletId: wallet.toLowerCase(), network },
    });
    const genIds = await getWalletGenIds(wallet, network);

    if (
      wallet.toLowerCase() ==
      '0xFE356c63D90BEA7800328283821d3BeD81760925'.toLowerCase()
    ) {
      console.log('genIds', genIds);
    }

    const [heroes, houses, averageFarm, stakeRanking, stakes, claimRanking] =
      await Promise.all([
        this.heroRepository.getHeroesFromGenId(genIds.heroes, network, wallet),
        getHousesFromGenIds(genIds.houses),
        this.mapRewardRepository.getAverageRewardByWalletId(walletEntity?.id),
        this.stakeRankingWalletRepository.getPositionRanking(wallet, network),
        this.stakeRepository.getStakesByWallet(wallet, network),
        this.claimRankingWalletRepository.getPositionRanking(
          wallet,
          network,
          ClaimToken.BCOIN,
        ),
      ]);

    return {
      walletId: wallet,
      heroes,
      houses,
      tokens: genIds.tokens,
      wallet: walletEntity,
      averageFarm,
      stakeRanking,
      claimRanking,
      stakes,
    };
  }
}
