import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  port: Number(process.env.PORT) || 4000,
  rpcUrl: requireEnv('RPC_URL'),
  biconomyApiKey: requireEnv('BICONOMY_API_KEY'),
  biconomyBundlerUrl: requireEnv('BICONOMY_BUNDLER_URL'),
  biconomyPaymasterUrl: requireEnv('BICONOMY_PAYMASTER_URL'),
  contractAddress: requireEnv('CONTRACT_ADDRESS'),
  googleClientId: requireEnv('GOOGLE_CLIENT_ID'),
  jwtSecret: requireEnv('JWT_SECRET'),
  walletMasterSecret: requireEnv('WALLET_MASTER_SECRET'),
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  dbPath:
    process.env.DATABASE_PATH ||
    path.resolve(__dirname, '../../data/app.db')
};

export type Env = typeof env;
export default env;
