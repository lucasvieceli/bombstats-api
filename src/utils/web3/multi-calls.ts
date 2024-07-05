import { WalletNetwork } from '@/database/models/Wallet';
import {
  getContractMultiCallBsc,
  getContractMultiCallPolygon,
  getRpcWeb3,
  isErrorRPC,
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
  try {
    const fnInstance = getRpcWeb3(network);
    const fnContractMult =
      network === WalletNetwork.BSC
        ? getContractMultiCallBsc(fnInstance)
        : getContractMultiCallPolygon(fnInstance);

    const contract = new fnInstance.eth.Contract(abi, contractAddress);

    const targets = Array(params.length).fill(contractAddress);
    const data = params.map((id) =>
      contract.methods[methodName](id).encodeABI(),
    );

    const result = (await fnContractMult.methods
      .multiCallExcept(targets, data)
      .call()) as any[];

    return result.map((r: any) =>
      fnInstance.eth.abi.decodeParameter('uint256', r),
    );
  } catch (error) {
    if (isErrorRPC(error)) {
      return getMultiCalls({
        contractAddress,
        abi,
        network,
        params,
        methodName,
      });
    }
    throw error;
  }
}
