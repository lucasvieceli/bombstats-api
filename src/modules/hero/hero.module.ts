import { HeroController } from '@/modules/hero/controllers/hero-controller';
import { HeroUpdateProcessor } from '@/modules/hero/processors/hero-update';
import { OnHeroRetail } from '@/modules/hero/processors/on-hero-retail';
import { GetBestCostQuartz } from '@/modules/hero/use-cases/get-best-cost-quartz';
import { GetHero } from '@/modules/hero/use-cases/get-hero';
import { GetHeroesByIds } from '@/modules/hero/use-cases/get-heroes-by-ids';
import { GetHeroesFromWallet } from '@/modules/hero/use-cases/get-heroes-from-wallet';
import { GetHeroesRetail } from '@/modules/hero/use-cases/get-heroes-retail';
import { UpdateHeroesById } from '@/modules/hero/use-cases/update-heroes-by-id';

export const HeroModules = {
  imports: [],
  controllers: [HeroController],
  providers: [
    GetHeroesByIds,
    HeroUpdateProcessor,
    GetHero,
    GetHeroesFromWallet,
    UpdateHeroesById,
    OnHeroRetail,
    GetHeroesRetail,
    GetBestCostQuartz,
  ],
};
