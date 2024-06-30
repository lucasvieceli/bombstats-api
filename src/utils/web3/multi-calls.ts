import { WalletNetwork } from '@/database/models/Wallet';
import {
  getContractMultiCallBsc,
  getContractMultiCallPolygon,
  instanceBscWeb3,
  instancePolygonWeb3,
} from '@/utils/web3/web3';

interface IGetMultiCalls {
  contractAddress: string;
  abi: any;
  network: WalletNetwork;
  params: string[] | number[];
  methodName: string;
}

export async function getMultiCalls({
  contractAddress,
  abi,
  network,
  params,
  methodName,
}: IGetMultiCalls) {
  const fnInstance =
    network === WalletNetwork.BSC ? instanceBscWeb3 : instancePolygonWeb3;
  const fnContractMult =
    network === WalletNetwork.BSC
      ? getContractMultiCallBsc()
      : getContractMultiCallPolygon();

  const contract = new fnInstance.eth.Contract(abi, contractAddress);

  const targets = Array(params.length).fill(contractAddress);
  const data = params.map((id) => contract.methods[methodName](id).encodeABI());

  const result = (await fnContractMult.methods
    .multiCall(targets, data)
    .call()) as any[];

  return result.map((r: any) =>
    fnInstance.eth.abi.decodeParameter('uint256', r),
  );
}
