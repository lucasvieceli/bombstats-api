import { HeroController } from '@/modules/hero/controllers/hero-controller';
import { OnHeroRetail } from '@/modules/hero/processors/on-hero-retail';
import { GetHero } from '@/modules/hero/use-cases/get-hero';
import {
  GetHeroesByIds,
  HeroUpdateProcessor,
} from '@/modules/hero/use-cases/get-heroes-by-ids';
import { GetHeroesFromWallet } from '@/modules/hero/use-cases/get-heroes-from-wallet';
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
  ],
};
