import { instancePolygonWeb3 } from '@/utils/web3/web3';
import { isAddress, checkAddressCheckSum } from 'web3-validator';

export function validateEthereumAddress(address: string) {
  try {
    const checksumAddress =
      instancePolygonWeb3.utils.toChecksumAddress(address);
    return isAddress(address) && checkAddressCheckSum(checksumAddress);
  } catch (error: any) {
    return false;
  }
}
