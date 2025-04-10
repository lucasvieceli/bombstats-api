import { WalletNetwork } from '@/database/models/Wallet';
import { ABI_MARKET } from '@/utils/web3/ABI/market';
import { getRpcWeb3 } from '@/utils/web3/web3';

export function decodeInputCreateOrder(inputData: string) {
  const method = ABI_MARKET.find((item) => item.name === 'createOrder');
  if (!method) {
    throw new Error('Method createOrder not found in ABI');
  }

  const parameters = method.inputs.map((input) => input.type);

  const decodedParameters = getRpcWeb3(
    WalletNetwork.BSC,
  ).eth.abi.decodeParameters(
    parameters,
    '0x' + inputData.slice(10), // Adicione '0x' para garantir que é um hex válido
  );

  const cleanDecodedParameters = parameters.map(
    (_, index) => decodedParameters[index],
  );

  return cleanDecodedParameters;
}

export function decodeInputBuy(inputData: string) {
  const method = ABI_MARKET.find((item) => item.name === 'buy');
  if (!method) {
    throw new Error('Method buy not found in ABI');
  }

  const parameters = method.inputs.map((input) => input.type);

  // Decodifique os parâmetros. Certifique-se de que o inputData esteja correto.
  const decodedParameters = getRpcWeb3(
    WalletNetwork.BSC,
  ).eth.abi.decodeParameters(
    parameters,
    '0x' + inputData.slice(10), // Adicione '0x' para garantir que é um hex válido
  );

  // Remova os valores extras (índices) do objeto decodificado
  const cleanDecodedParameters = parameters.map(
    (_, index) => decodedParameters[index],
  );

  return cleanDecodedParameters;
}
