import {
  GetHeroesByIds,
  HeroUpdateProcessor,
} from '@/modules/hero/use-cases/get-heroes-by-ids';

export const HeroModules = {
  imports: [],
  controllers: [],
  providers: [GetHeroesByIds, HeroUpdateProcessor],
};
