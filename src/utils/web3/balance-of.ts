import { WalletNetwork } from '@/database/models/Wallet';
import { instanceBscWeb3, instancePolygonWeb3 } from '@/utils/web3/web3';

export async function balanceOf(
  contractAddress: string,
  address: string,
  network: WalletNetwork,
) {
  const web3 =
    network === WalletNetwork.BSC ? instanceBscWeb3 : instancePolygonWeb3;

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
}
