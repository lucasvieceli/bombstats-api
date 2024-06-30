import { WalletNetwork } from '@/database/models/Wallet';
import { ABI_ROCK } from '@/utils/web3/ABI/rock-abi';
import { instanceBscWeb3, instancePolygonWeb3 } from '@/utils/web3/web3';

export async function getTotalRock(wallet: string, network: WalletNetwork) {
  const fnInstance =
    network === WalletNetwork.BSC ? instanceBscWeb3 : instancePolygonWeb3;
  const contractAddressRock =
    network === WalletNetwork.BSC
      ? process.env.CONTRACT_ROCK_BSC
      : process.env.CONTRACT_ROCK_POLYGON;

  const contract = new fnInstance.eth.Contract(ABI_ROCK, contractAddressRock);

  return Number(await contract.methods.getTotalRockByUser(wallet).call());
}
