import { WalletNetwork } from '@/database/models/Wallet';
import { getRpcWeb3, isErrorRPC } from '@/utils/web3/web3';

export async function balanceOf(
  contractAddress: string,
  address: string,
  network: WalletNetwork,
) {
  try {
    const web3 = getRpcWeb3(network);

    const contract = new web3.eth.Contract(
      [
        {
          inputs: [
            {
              internalType: 'address',
              name: 'account',
              type: 'address',
            },
          ],
          name: 'balanceOf',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      web3.utils.toChecksumAddress(contractAddress),
    );

    const value = (await contract.methods.balanceOf(address).call()) as any;
    return Number(web3.utils.fromWei(value, 'ether'));
  } catch (error) {
    if (isErrorRPC(error)) {
      return balanceOf(contractAddress, address, network);
    }
    throw error;
  }
}
