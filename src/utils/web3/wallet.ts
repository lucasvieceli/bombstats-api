import { WalletNetwork } from '@/database/models/Wallet';
import { ABI_BALANCE } from '@/utils/web3/ABI/balance-abi';
import { ABI_HERO } from '@/utils/web3/ABI/hero-abi';
import {
  getContractMultiCallBsc,
  getContractMultiCallPolygon,
  getRpcWeb3,
  isErrorRPC,
} from '@/utils/web3/web3';

export async function getWalletGenIds(wallet: string, network: WalletNetwork) {
  let timeout: NodeJS.Timeout;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error('evm timeout'));
      }, 5000);
    });

    const mainPromise = (async () => {
      const fnInstance = getRpcWeb3(network);

      const fnContractMult =
        network === WalletNetwork.BSC
          ? getContractMultiCallBsc(fnInstance)
          : getContractMultiCallPolygon(fnInstance);

      const contractAddressHero =
        network === WalletNetwork.BSC
          ? process.env.CONTRACT_HERO_BSC
          : process.env.CONTRACT_HERO_POLYGON;
      const contractAddressHouse =
        network === WalletNetwork.BSC
          ? process.env.CONTRACT_HOUSE_BSC
          : process.env.CONTRACT_HOUSE_POLYGON;
      const contractAddressBomb =
        network === WalletNetwork.BSC
          ? process.env.CONTRACT_BOMB_BSC
          : process.env.CONTRACT_BOMB_POLYGON;
      const contractAddressSen =
        network === WalletNetwork.BSC
          ? process.env.CONTRACT_SEN_BSC
          : process.env.CONTRACT_SEN_POLYGON;

      const contractHero = new fnInstance.eth.Contract(
        ABI_HERO,
        contractAddressHero,
      );
      const contractHouse = new fnInstance.eth.Contract(
        ABI_HERO,
        contractAddressHouse,
      );
      const contractBomb = new fnInstance.eth.Contract(
        ABI_BALANCE,
        contractAddressBomb,
      );
      const contractSen = new fnInstance.eth.Contract(
        ABI_BALANCE,
        contractAddressBomb,
      );

      const targets = [
        contractAddressHero,
        contractAddressHouse,
        contractAddressBomb,
        contractAddressSen,
      ];
      const data = [
        contractHero.methods.getTokenDetailsByOwner(wallet).encodeABI(),
        contractHouse.methods.getTokenDetailsByOwner(wallet).encodeABI(),
        contractBomb.methods.balanceOf(wallet).encodeABI(),
        contractSen.methods.balanceOf(wallet).encodeABI(),
      ];
      const result = await fnContractMult.methods
        .multiCallExcept(targets, data)
        .call();

      return {
        heroes: fnInstance.eth.abi.decodeParameter(
          'uint256[]',
          result[0],
        ) as number[],
        houses: (
          fnInstance.eth.abi.decodeParameter('uint256[]', result[1]) as number[]
        ).map((v) => v.toString()),
        tokens: {
          bomb:
            Number(fnInstance.eth.abi.decodeParameter('uint256', result[2])) /
            1e18,
          sen:
            Number(fnInstance.eth.abi.decodeParameter('uint256', result[3])) /
            1e18,
        },
      };
    })();

    const result = await Promise.race([mainPromise, timeoutPromise]);

    clearTimeout(timeout);
    return result;
  } catch (e) {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (isErrorRPC(e)) {
      if (
        wallet.toLowerCase() ===
        '0xFE356c63D90BEA7800328283821d3BeD81760925'.toLowerCase()
      ) {
        console.log(e, 'getWalletGenIdserror');
      }
      return getWalletGenIds(wallet, network);
    }
    console.error(e);
    throw e;
  }
}
