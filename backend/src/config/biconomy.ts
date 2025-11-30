import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from '@biconomy/account';
import { Bundler } from '@biconomy/bundler';
import { BiconomyPaymaster, PaymasterMode } from '@biconomy/paymaster';
import { JsonRpcProvider, Wallet } from 'ethers';
import env from './env';

const provider = new JsonRpcProvider(env.rpcUrl);

let chainIdCache: number | null = null;
const getChainId = async (): Promise<number> => {
  if (chainIdCache) return chainIdCache;
  const network = await provider.getNetwork();
  chainIdCache = Number(network.chainId);
  return chainIdCache;
};

const createBundler = async () => {
  const chainId = await getChainId();
  return new Bundler({
    bundlerUrl: env.biconomyBundlerUrl,
    chainId,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS
  });
};

const createPaymaster = () => {
  return new BiconomyPaymaster({
    paymasterUrl: env.biconomyPaymasterUrl
  });
};

export const createSmartAccount = async (signer: Wallet, index: number) => {
  const chainId = await getChainId();
  const bundler = await createBundler();
  const paymaster = createPaymaster();

  return BiconomySmartAccountV2.create({
    signer,
    chainId,
    bundler,
    paymaster,
    rpcUrl: env.rpcUrl,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    index,
    biconomyPaymasterApiKey: env.biconomyApiKey
  });
};

export const getSponsoredPaymasterData = () => ({
  paymasterServiceData: { mode: PaymasterMode.SPONSORED }
});

export const getJsonRpcProvider = () => provider;
