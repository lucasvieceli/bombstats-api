import { WalletController } from '@/modules/wallet/controllers/wallet-controller';
import { GetWallet } from '@/modules/wallet/use-cases/get-wallet';

export const WalletModules = {
  imports: [],
  controllers: [WalletController],
  providers: [GetWallet],
};
