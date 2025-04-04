import { StakeController } from '@/modules/stake/controllers/stake-controller';
import { GetTopHeroesGlobalByRarity } from '@/modules/stake/use-cases/get-top-heroes-global-by-rarity';
import { GetTopTwentyRarityHeroes } from '@/modules/stake/use-cases/get-top-twenty-rarity-heroes';
import { GetTopTwentyWalletStake } from '@/modules/stake/use-cases/get-top-twenty-wallet-stake';
import { GetTopWalletStakeGlobal } from '@/modules/stake/use-cases/get-top-wallet-stake-global';
import { UpdateStakeRanking } from '@/modules/stake/use-cases/update-stake-ranking';

export const StakeModules = {
  imports: [],
  controllers: [StakeController],
  providers: [
    UpdateStakeRanking,
    GetTopTwentyRarityHeroes,
    GetTopTwentyWalletStake,
    GetTopWalletStakeGlobal,
    GetTopHeroesGlobalByRarity,
  ],
};
