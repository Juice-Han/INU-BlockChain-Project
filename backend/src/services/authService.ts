import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { Wallet } from 'ethers';
import db from '../config/db';
import env from '../config/env';
import { createSmartAccount } from '../config/biconomy';
import { deriveDeterministicPrivateKey, deriveSmartAccountIndex } from '../config/crypto';
import { getProvider } from '../config/contract';

const oauthClient = new OAuth2Client(env.googleClientId);

export interface UserRecord {
  id: number;
  googleId: string;
  email: string;
  name: string | null;
  picture: string | null;
  smartAccountAddress: string;
  createdAt: string;
}

export interface PublicUser {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
  smartAccountAddress: string;
}

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string | null;
  picture: string | null;
}

const mapUserRow = (row: any): UserRecord => ({
  id: row.id,
  googleId: row.google_id,
  email: row.email,
  name: row.name,
  picture: row.picture,
  smartAccountAddress: row.smart_account_address,
  createdAt: row.created_at
});

const selectUserByGoogleId = db.prepare(
  `SELECT * FROM users WHERE google_id = ? LIMIT 1`
);
const selectUserById = db.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`);
const insertUser = db.prepare(
  `INSERT INTO users (google_id, email, name, picture, smart_account_address)
   VALUES (@google_id, @email, @name, @picture, @smart_account_address)`
);

export const toPublicUser = (user: UserRecord): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  picture: user.picture,
  smartAccountAddress: user.smartAccountAddress
});

const createJwt = (user: UserRecord): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      smartAccountAddress: user.smartAccountAddress
    },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
};

const buildUserSmartAccount = async (googleId: string) => {
  const signerKey = deriveDeterministicPrivateKey(googleId);
  const signer = new Wallet(signerKey, getProvider());
  const index = deriveSmartAccountIndex(googleId);
  const smartAccount = await createSmartAccount(signer, index);
  const smartAccountAddress = await smartAccount.getAccountAddress();
  return { smartAccountAddress, signer };
};

const createUser = async (profile: GoogleProfile): Promise<UserRecord> => {
  const { smartAccountAddress } = await buildUserSmartAccount(profile.googleId);

  const result = insertUser.run({
    google_id: profile.googleId,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    smart_account_address: smartAccountAddress
  });

  return {
    id: Number(result.lastInsertRowid),
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    smartAccountAddress,
    createdAt: new Date().toISOString()
  };
};

export const getUserById = (id: number): UserRecord | undefined => {
  const row = selectUserById.get(id);
  return row ? mapUserRow(row) : undefined;
};

export const getUserByGoogleId = (
  googleId: string
): UserRecord | undefined => {
  const row = selectUserByGoogleId.get(googleId);
  return row ? mapUserRow(row) : undefined;
};

const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: env.googleClientId
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Invalid Google token payload');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || null,
    picture: payload.picture || null
  };
};

export const authenticateWithGoogle = async (idToken: string) => {
  const profile = await verifyGoogleIdToken(idToken);

  let user = getUserByGoogleId(profile.googleId);
  if (!user) {
    user = await createUser(profile);
  }

  const token = createJwt(user);
  return { token, user: toPublicUser(user) };
};
