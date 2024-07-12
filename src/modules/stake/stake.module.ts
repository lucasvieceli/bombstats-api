import { StakeController } from '@/modules/stake/controllers/stake-controller';
import { GetTopTwentyRarityHeroes } from '@/modules/stake/use-cases/get-top-twenty-rarity-heroes';
import { GetTopTwentyWalletStake } from '@/modules/stake/use-cases/get-top-twenty-wallet-stake';
import { UpdateStakeRanking } from '@/modules/stake/use-cases/update-stake-ranking';

export const StakeModules = {
  imports: [],
  controllers: [StakeController],
  providers: [
    UpdateStakeRanking,
    GetTopTwentyRarityHeroes,
    GetTopTwentyWalletStake,
  ],
};
