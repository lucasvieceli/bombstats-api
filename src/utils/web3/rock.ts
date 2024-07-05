import { WalletNetwork } from '@/database/models/Wallet';
import { ABI_ROCK } from '@/utils/web3/ABI/rock-abi';
import { getRpcWeb3, isErrorRPC } from '@/utils/web3/web3';

export async function getTotalRock(wallet: string, network: WalletNetwork) {
  try {
    const fnInstance = getRpcWeb3(network);
    const contractAddressRock =
      network === WalletNetwork.BSC
        ? process.env.CONTRACT_ROCK_BSC
        : process.env.CONTRACT_ROCK_POLYGON;

    const contract = new fnInstance.eth.Contract(ABI_ROCK, contractAddressRock);

    return Number(await contract.methods.getTotalRockByUser(wallet).call());
  } catch (e) {
    if (isErrorRPC(e)) {
      return getTotalRock(wallet, network);
    }
    throw e;
  }
}
