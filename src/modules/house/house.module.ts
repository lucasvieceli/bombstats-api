import { HouseController } from '@/modules/house/controllers/hero-controller';
import { GetHouse } from '@/modules/house/use-cases/get-house';
import {
  GetHousesByIds,
  HouseUpdateProcessor,
} from '@/modules/house/use-cases/get-houses-by-ids';
import { GetHousesFromWallet } from '@/modules/house/use-cases/get-houses-from-wallet';
import { UpdateHousesById } from '@/modules/house/use-cases/update-houses-by-id';

export const HouseModules = {
  imports: [],
  controllers: [HouseController],
  providers: [
    GetHousesByIds,
    HouseUpdateProcessor,
    GetHouse,
    GetHousesFromWallet,
    UpdateHousesById,
  ],
};
