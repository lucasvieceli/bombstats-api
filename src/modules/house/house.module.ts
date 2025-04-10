import { HouseController } from '@/modules/house/controllers/house-controller';
import { HouseUpdateProcessor } from '@/modules/house/processors/house-update';
import { OnHouseRetail } from '@/modules/house/processors/on-house-retail';
import { GetHouse } from '@/modules/house/use-cases/get-house';
import { GetHousesByIds } from '@/modules/house/use-cases/get-houses-by-ids';
import { GetHousesFromWallet } from '@/modules/house/use-cases/get-houses-from-wallet';
import { GetHousesRetail } from '@/modules/house/use-cases/get-houses-retail';
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
    OnHouseRetail,
    GetHousesRetail,
  ],
};
