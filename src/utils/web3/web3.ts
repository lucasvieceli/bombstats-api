import { WalletNetwork } from '@/database/models/Wallet';
import { ABI_HERO } from '@/utils/web3/ABI/hero-abi';
import { ABI_MULTI_CALL } from '@/utils/web3/ABI/multi-call-abi';

import Web3 from 'web3';

export function getContractMultiCallPolygon(web3: Web3) {
  return new web3.eth.Contract(
    ABI_MULTI_CALL,
    '0x7A8F20A0Bf4af6d56FB0Fc1E371987FA41741877',
  );
}

export function getContractMultiCallBsc(web3: Web3) {
  return new web3.eth.Contract(
    ABI_MULTI_CALL,
    '0xb80411Dee1fa1ee98F04FdA761cdDff46e93C7cA',
  );
}

export function getContractHeroPolygon(web3: Web3) {
  return new web3.eth.Contract(ABI_HERO, process.env.CONTRACT_HERO_POLYGON);
}

export function getContractHeroBsc(web3: Web3) {
  return new web3.eth.Contract(ABI_HERO, process.env.CONTRACT_HERO_BSC);
}

const rpcUrlsPolygon = [
  'https://rpc.ankr.com/polygon',
  'https://rpc-mainnet.maticvigil.com',
  'https://rpc-mainnet.matic.quiknode.pro',
  'https://polygon-rpc.com',
  'https://rpc-mainnet.matic.network',
  'https://matic-mainnet.chainstacklabs.com',
  'https://polygon-bor-rpc.publicnode.com',
];

const rpcUrlsBsc = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.bnbchain.org',
  'https://bsc-dataseed2.bnbchain.org',
  'https://bsc-dataseed3.bnbchain.org',
  'https://bsc-dataseed4.bnbchain.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.defibit.io',
  'https://bsc-dataseed3.defibit.io',
  'https://bsc-dataseed4.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
  'https://bsc-dataseed2.ninicoin.io',
  'https://bsc-dataseed3.ninicoin.io',
  'https://bsc-dataseed4.ninicoin.io',
  'https://bsc-rpc.publicnode.com',
];

export const ERRORS_RPC = [
  'reason: Unexpected token O in JSON at',
  'reason: getaddrinfo ENOTFOUND',
  'reason: connect ECONNREFUSED',
  'Unexpected token < in JSON at position 0',
];

export function isErrorRPC(error: any) {
  return ERRORS_RPC.some((err) => error.message.includes(err));
}

export function getRpcWeb3(network: WalletNetwork) {
  const rpcUrls =
    network === WalletNetwork.POLYGON ? rpcUrlsPolygon : rpcUrlsBsc;

  const rpcUrl = rpcUrls[Math.floor(Math.random() * rpcUrls.length)];
  return new Web3(new Web3.providers.HttpProvider(rpcUrl));
}
