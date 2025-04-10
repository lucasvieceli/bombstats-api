import { WalletController } from '@/modules/wallet/controllers/wallet-controller';
import { GetWallet } from '@/modules/wallet/use-cases/get-wallet';
import { GetWalletSimulator } from '@/modules/wallet/use-cases/get-wallet-simulator';

export const WalletModules = {
  imports: [],
  controllers: [WalletController],
  providers: [GetWallet, GetWalletSimulator],
};
