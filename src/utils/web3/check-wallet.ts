import { isErrorRPC } from '@/utils/web3/web3';
import { isAddress } from 'web3-validator';

export function validateEthereumAddress(address: string) {
  try {
    return isAddress(address);
  } catch (error: any) {
    console.log('error validateEthereumAddress', error);
    if (isErrorRPC(error)) {
      return validateEthereumAddress(address);
    }

    return false;
  }
}
