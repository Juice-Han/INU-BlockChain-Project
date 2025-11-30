import crypto from 'crypto';
import env from './env';

export const deriveDeterministicPrivateKey = (googleId: string): string => {
  // Derive a stable 32-byte key from googleId + WALLET_MASTER_SECRET
  // CRITICAL: Uses separate secret from JWT to prevent cross-contamination
  const hash = crypto
    .createHmac('sha256', env.walletMasterSecret)
    .update(googleId)
    .digest('hex');
  return '0x' + hash;
};

export const deriveSmartAccountIndex = (googleId: string): number => {
  // Use first 4 bytes of the same hash as deterministic index
  const hash = crypto
    .createHash('sha256')
    .update(googleId)
    .digest('hex')
    .slice(0, 8);
  return Number.parseInt(hash, 16);
};
