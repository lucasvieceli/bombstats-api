import { WalletNetwork } from '@/database/models/Wallet';
import { ABI_HERO } from '@/utils/web3/ABI/hero-abi';
import { ABI_MULTI_CALL } from '@/utils/web3/ABI/multi-call-abi';
import { Logger } from '@nestjs/common';
import { promise as ping } from 'ping';

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
  latency?: number;
}

const rpcUrlsPolygon: RpcUrl[] = [
  // { url: 'https://polygon-rpc.com', online: true },
  { url: 'https://rpc.ankr.com/polygon', online: true },
  { url: 'https://polygon.llamarpc.com', online: true },
  { url: 'https://rpc-mainnet.maticvigil.com', online: true },
  { url: 'https://rpc-mainnet.matic.quiknode.pro', online: true },
  { url: 'https://rpc-mainnet.matic.network', online: true },
  { url: 'https://polygon.blockpi.network/v1/rpc/public', online: true },
  { url: 'https://polygon-mainnet.gateway.tatum.io', online: true },
  { url: 'https://matic-mainnet.chainstacklabs.com', online: true },
  { url: 'https://polygon-bor-rpc.publicnode.com', online: true },
  { url: 'https://polygon-pokt.nodies.app', online: true },
  { url: 'https://polygon.rpc.blxrbdn.com', online: true },
  { url: 'https://polygon-mainnet.public.blastapi.io', online: true },
  { url: 'https://polygon-mainnet.public.blastapi.io', online: true },
  { url: 'https://matic-mainnet-full-rpc.bwarelabs.com', online: true },
  { url: 'https://polygon.gateway.tenderly.co', online: true },
  { url: 'https:///polygon.drpc.org', online: true },
];

const rpcUrlsBsc: RpcUrl[] = [
  { url: 'https://bsc-dataseed.binance.org', online: true },
  { url: 'https://bsc-dataseed1.bnbchain.org', online: true },
  { url: 'https://binance.llamarpc.com', online: true },
  { url: 'https://bsc-dataseed2.bnbchain.org', online: true },
  { url: 'https://bsc-dataseed3.bnbchain.org', online: true },
  { url: 'https://bsc-dataseed4.bnbchain.org', online: true },
  { url: 'https://bsc-dataseed1.defibit.io', online: true },
  { url: 'https://rpc.ankr.com/bsc', online: true },
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
  'reason: read ECONNRESET',
  'Unexpected token < in JSON at position 0',
  'did it run Out of Gas?',
  'Invalid response',
  'reason: read ETIMEDOUT',
  'evm timeout',
  'request timed out',
  'rate limit exceeded',
  'nenhum rpc online',
  'invalid json response body',
  'Failed to fetch',
  'socket hang up',
  'Unable to perform request',
  'failed',
  'You reached the free tier limits',
  'call returned result of length',
  'execution aborted',
  'GRPC Context cancellation',
  'the method eth_call does not exist/is',
];

export function isErrorRPC(error: any) {
  if (error.message.includes('rate limit exceeded')) {
    const totalOnlinePolygon = rpcUrlsPolygon.filter(
      (rpcUrl) => rpcUrl.online,
    ).length;

    Logger.error(`rate limit exceeded ${totalOnlinePolygon} online`, 'RPC');
  }

  return ERRORS_RPC.some((err) => error.message.includes(err));
}

async function updateRpcStatuses(rpcUrls: RpcUrl[]) {
  await Promise.all(
    rpcUrls.map(async (rpcUrl) => {
      const status = await checkRpcStatus(rpcUrl);
      rpcUrl.online = status.online;
      rpcUrl.latency = status.latency;
    }),
  );
}

async function checkRpcStatus(
  rpcUrl: RpcUrl,
): Promise<{ online: boolean; latency: number | null }> {
  const timeout = new Promise<{ online: boolean; latency: number | null }>(
    (_, reject) => setTimeout(() => reject(new Error('timeout')), 10000),
  );

  const check = async () => {
    const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl.url));
    await web3.eth.net.isListening();
    return { online: true, latency: await getPing(rpcUrl.url) };
  };

  try {
    // const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl.url));
    // await web3.eth.net.isListening();
    // return { online: true, latency: 1 };
    return await Promise.race([check(), timeout]);
  } catch (error) {
    // console.log('error', rpcUrl, error);
    return { online: false, latency: null };
  }
}

async function getPing(url: string): Promise<number | null> {
  const host = new URL(url).hostname;
  try {
    const res = await ping.probe(host);
    return res.time; // returns the latency in ms
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function startRpcStatusUpdater(interval: number = 1000 * 60) {
  // 60 seconds
  await Promise.all([
    updateRpcStatuses(rpcUrlsPolygon),
    updateRpcStatuses(rpcUrlsBsc),
  ]);

  console.log('RPC Statuses updated', {
    polygon: rpcUrlsPolygon.filter((rpc) => rpc.online).length,
    bsc: rpcUrlsBsc.filter((rpc) => rpc.online).length,
  });

  setInterval(async () => {
    console.log('verificando');
    await Promise.all([
      updateRpcStatuses(rpcUrlsPolygon),
      updateRpcStatuses(rpcUrlsBsc),
    ]);

    console.log('RPC Statuses updated', {
      polygon: rpcUrlsPolygon.filter((rpc) => rpc.online).length,
      bsc: rpcUrlsBsc.filter((rpc) => rpc.online).length,
    });
  }, interval);
}

export function getRpcWeb3(network: WalletNetwork) {
  const rpcUrls =
    network === WalletNetwork.POLYGON ? rpcUrlsPolygon : rpcUrlsBsc;
  const onlineRpcUrls = rpcUrls.filter((rpcUrl) => rpcUrl.online);

  let rpcUrl = onlineRpcUrls[Math.floor(Math.random() * onlineRpcUrls.length)];

  if (!rpcUrl) {
    if (network === WalletNetwork.POLYGON) {
      console.log('nenhum rpc online polygon');
      // updateRpcStatuses(rpcUrlsPolygon);
      // throw new Error('nenhum rpc online');
    } else {
      console.log('nenhum rpc online bsc');
      // updateRpcStatuses(rpcUrlsBsc);
      // throw new Error('nenhum rpc online');
    }
    rpcUrl = rpcUrls[Math.floor(Math.random() * rpcUrls.length)];
  }
  return new Web3(new Web3.providers.HttpProvider(rpcUrl.url));
}

export function decodeInputTransaction(
  inputData: string,
  methodName: string,
  abi: any,
  rpc?: Web3,
) {
  try {
    const method = abi.find((item) => item.name === methodName);
    if (!method) {
      throw new Error('Method depositCoinIntoHeroId not found in ABI');
    }

    const parameters = method.inputs.map((input) => input.type);
    let web3 = rpc;
    if (!web3) {
      web3 = getRpcWeb3(WalletNetwork.BSC);
    }

    const decodedParameters = web3.eth.abi.decodeParameters(
      parameters,
      '0x' + inputData.slice(10), // Adicione '0x' para garantir que é um hex válido
    );

    const cleanDecodedParameters = parameters.map(
      (_, index) => decodedParameters[index],
    );

    return cleanDecodedParameters;
  } catch (e) {
    if (isErrorRPC(e)) {
      return decodeInputTransaction(inputData, methodName, abi);
    }

    throw e;
  }
}
