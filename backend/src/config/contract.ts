import { Contract, Interface, JsonRpcProvider, Provider, Signer } from 'ethers';
import env from './env';
import abi from '../abi/ClubManager.json';
import { getJsonRpcProvider } from './biconomy';

const provider = new JsonRpcProvider(env.rpcUrl);
const clubInterface = new Interface(abi);

export const getProvider = (): JsonRpcProvider => provider;

export const getClubContract = (
  signerOrProvider: Signer | Provider = getJsonRpcProvider()
): Contract => {
  return new Contract(env.contractAddress, clubInterface, signerOrProvider);
};

export { clubInterface };
