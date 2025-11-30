import { formatEther, parseEther, Wallet } from 'ethers';
import db from '../config/db';
import env from '../config/env';
import { clubInterface, getClubContract, getProvider } from '../config/contract';
import { getUserById } from './authService';
import {
  deriveDeterministicPrivateKey,
  deriveSmartAccountIndex
} from '../config/crypto';
import {
  createSmartAccount,
  getSponsoredPaymasterData
} from '../config/biconomy';
import { withTimeout } from '../utils/timeout';

interface ClubRecord {
  id: number;
  name: string;
  adminUserId: number;
  txHash: string;
  createdAt: string;
}

const mapClubRow = (row: any): ClubRecord => ({
  id: row.id,
  name: row.name,
  adminUserId: row.admin_user_id,
  txHash: row.tx_hash,
  createdAt: row.created_at
});

const insertClub = db.prepare(
  `INSERT OR IGNORE INTO clubs (id, name, admin_user_id, tx_hash)
   VALUES (@id, @name, @admin_user_id, @tx_hash)`
);
const insertMembership = db.prepare(
  `INSERT OR IGNORE INTO memberships (club_id, user_id) VALUES (@club_id, @user_id)`
);
const selectClubById = db.prepare(`SELECT * FROM clubs WHERE id = ? LIMIT 1`);
const selectMembersForClub = db.prepare(
  `SELECT u.id, u.name, u.email, u.smart_account_address
   FROM memberships m
   JOIN users u ON u.id = m.user_id
   WHERE m.club_id = ?`
);

const buildSmartAccountForUser = async (userId: number) => {
  const user = getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const pk = deriveDeterministicPrivateKey(user.googleId);
  const signer = new Wallet(pk, getProvider());
  const index = deriveSmartAccountIndex(user.googleId);
  const smartAccount = await createSmartAccount(signer, index);
  return { smartAccount, smartAccountAddress: user.smartAccountAddress };
};

const sendUserOperation = async (
  smartAccount: any,
  tx: { to: string; data: string; value?: bigint }
) => {
  const userOpResponse = await withTimeout(
    smartAccount.sendTransaction(tx, getSponsoredPaymasterData()),
    60000,
    'Transaction submission timed out after 60 seconds'
  );

  const txHashResponse = await withTimeout(
    userOpResponse.waitForTxHash(),
    60000,
    'Waiting for transaction hash timed out after 60 seconds'
  );

  const txHash =
    typeof txHashResponse === 'string'
      ? txHashResponse
      : (txHashResponse?.transactionHash as string | undefined);

  await withTimeout(
    userOpResponse.wait(),
    120000,
    'Waiting for transaction confirmation timed out after 120 seconds'
  );

  return txHash || '';
};

export const createClub = async (userId: number, name: string) => {
  const { smartAccount } = await buildSmartAccountForUser(userId);

  const data = clubInterface.encodeFunctionData('createClub', [name]);
  const txHash = await sendUserOperation(smartAccount, {
    to: env.contractAddress,
    data
  });

  // Wait for transaction receipt and extract club ID from event
  const receipt = await getProvider().getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw new Error('Transaction failed or not mined');
  }

  // Parse ClubCreated event to get actual club ID
  let clubId: number | null = null;
  for (const log of receipt.logs) {
    try {
      const parsed = clubInterface.parseLog({
        topics: log.topics as string[],
        data: log.data
      });
      if (parsed && parsed.name === 'ClubCreated') {
        clubId = Number(parsed.args.clubId);
        break;
      }
    } catch {
      // Skip logs that don't match our interface
      continue;
    }
  }

  if (clubId === null) {
    throw new Error('Failed to extract club ID from transaction');
  }

  // Wrap database operations in transaction
  const insertClubAndMember = db.transaction(() => {
    insertClub.run({
      id: clubId,
      name,
      admin_user_id: userId,
      tx_hash: txHash
    });

    insertMembership.run({ club_id: clubId, user_id: userId });
  });

  insertClubAndMember();

  return { clubId, txHash };
};

export const joinClub = async (userId: number, clubId: number) => {
  const { smartAccount } = await buildSmartAccountForUser(userId);
  const data = clubInterface.encodeFunctionData('joinClub', [clubId]);
  const txHash = await sendUserOperation(smartAccount, {
    to: env.contractAddress,
    data
  });

  insertMembership.run({ club_id: clubId, user_id: userId });

  return { txHash };
};

export const payClubFee = async (
  userId: number,
  clubId: number,
  amountEth: string
) => {
  const { smartAccount } = await buildSmartAccountForUser(userId);
  const value = parseEther(amountEth);
  const data = clubInterface.encodeFunctionData('payFee', [clubId]);

  const txHash = await sendUserOperation(smartAccount, {
    to: env.contractAddress,
    data,
    value
  });

  return { txHash };
};

export const getClubDetails = async (clubId: number) => {
  const readContract = getClubContract(getProvider());
  const [name, admin, balance, memberCount] = await readContract.getClubInfo(
    clubId
  );
  const membersOnChain = await readContract.getMembers(clubId);

  const clubRow = selectClubById.get(clubId);
  const club = clubRow ? mapClubRow(clubRow) : null;
  const members = selectMembersForClub.all(clubId) as {
    id: number;
    name: string | null;
    email: string;
    smart_account_address: string;
  }[];

  return {
    onChain: {
      clubId,
      name,
      admin,
      balanceWei: balance.toString(),
      balanceEth: formatEther(balance),
      memberCount: Number(memberCount),
      members: membersOnChain
    },
    offChain: {
      club,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        smartAccountAddress: m.smart_account_address
      }))
    }
  };
};
