import { WalletNetwork } from '@/database/models/Wallet';
import { getRpcWeb3, isErrorRPC } from '@/utils/web3/web3';
import { checkAddressCheckSum, isAddress } from 'web3-validator';

export function validateEthereumAddress(address: string) {
  try {
    const fnInstance = getRpcWeb3(WalletNetwork.POLYGON);

    const checksumAddress = fnInstance.utils.toChecksumAddress(address);
    return isAddress(address) && checkAddressCheckSum(checksumAddress);
  } catch (error: any) {
    console.log('error validateEthereumAddress', error);
    if (isErrorRPC(error)) {
      return validateEthereumAddress(address);
    }

    return false;
  }
}
