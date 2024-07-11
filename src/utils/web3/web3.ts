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

interface RpcUrl {
  url: string;
  online: boolean;
}

const rpcUrlsPolygon: RpcUrl[] = [
  { url: 'https://polygon-rpc.com', online: true },
  { url: 'https://rpc.ankr.com/polygon', online: true },
  { url: 'https://rpc-mainnet.maticvigil.com', online: true },
  // { url: 'https://rpc-amoy.polygon.technology', online: true },
  { url: 'https://rpc-mainnet.matic.quiknode.pro', online: true },
  { url: 'https://rpc-mainnet.matic.network', online: true },
  { url: 'https://matic-mainnet.chainstacklabs.com', online: true },
  { url: 'https://polygon-bor-rpc.publicnode.com', online: true },
];

const rpcUrlsBsc: RpcUrl[] = [
  { url: 'https://bsc-dataseed.binance.org', online: true },
  { url: 'https://bsc-dataseed1.bnbchain.org', online: true },
  { url: 'https://bsc-dataseed2.bnbchain.org', online: true },
  { url: 'https://bsc-dataseed3.bnbchain.org', online: true },
  { url: 'https://bsc-dataseed4.bnbchain.org', online: true },
  { url: 'https://bsc-dataseed1.defibit.io', online: true },
  { url: 'https://bsc-dataseed2.defibit.io', online: true },
  { url: 'https://bsc-dataseed3.defibit.io', online: true },
  { url: 'https://bsc-dataseed4.defibit.io', online: true },
  { url: 'https://bsc-dataseed1.ninicoin.io', online: true },
  { url: 'https://bsc-dataseed2.ninicoin.io', online: true },
  { url: 'https://bsc-dataseed3.ninicoin.io', online: true },
  { url: 'https://bsc-dataseed4.ninicoin.io', online: true },
  { url: 'https://bsc-rpc.publicnode.com', online: true },
];
export const ERRORS_RPC = [
  'reason: Unexpected token O in JSON at',
  'reason: getaddrinfo ENOTFOUND',
  'reason: connect ECONNREFUSED',
  'Unexpected token < in JSON at position 0',
  'did it run Out of Gas?',
];

export function isErrorRPC(error: any) {
  return ERRORS_RPC.some((err) => error.message.includes(err));
}

async function updateRpcStatuses(rpcUrls: RpcUrl[]) {
  await Promise.all(
    rpcUrls.map(
      async (rpcUrl) => (rpcUrl.online = await checkRpcStatus(rpcUrl)),
    ),
  );
}
async function checkRpcStatus(rpcUrl: RpcUrl): Promise<boolean> {
  const timeout = new Promise<boolean>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 2000),
  );

  const check = async () => {
    const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl.url));
    await web3.eth.net.isListening();
    return true;
  };

  try {
    return await Promise.race([check(), timeout]);
  } catch (error) {
    return false;
  }
}

export async function startRpcStatusUpdater(interval: number = 60000) {
  // 60 seconds
  await Promise.all([
    updateRpcStatuses(rpcUrlsPolygon),
    updateRpcStatuses(rpcUrlsBsc),
  ]);
  setInterval(() => {
    updateRpcStatuses(rpcUrlsPolygon);
    updateRpcStatuses(rpcUrlsBsc);
  }, interval);
}

export function getRpcWeb3(network: WalletNetwork) {
  const rpcUrls =
    network === WalletNetwork.POLYGON ? rpcUrlsPolygon : rpcUrlsBsc;
  const onlineRpcUrls = rpcUrls.filter((rpcUrl) => rpcUrl.online);

  let rpcUrl = onlineRpcUrls[Math.floor(Math.random() * onlineRpcUrls.length)];

  if (!rpcUrl) {
    rpcUrl = rpcUrls[0];
  }
  return new Web3(new Web3.providers.HttpProvider(rpcUrl.url));
}
