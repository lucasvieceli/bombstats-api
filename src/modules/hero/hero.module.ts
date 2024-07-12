import { HeroController } from '@/modules/hero/controllers/hero-controller';
import { GetHero } from '@/modules/hero/use-cases/get-hero';
import {
  GetHeroesByIds,
  HeroUpdateProcessor,
} from '@/modules/hero/use-cases/get-heroes-by-ids';

export const HeroModules = {
  imports: [],
  controllers: [HeroController],
  providers: [GetHeroesByIds, HeroUpdateProcessor, GetHero],
};
