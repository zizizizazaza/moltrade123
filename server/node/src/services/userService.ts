import { Pool } from "pg";
import { pool } from "../db";

export interface AppUser {
  user_id: string;
  auth_provider: string;
  primary_wallet: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}

export interface UserExecutionWallet {
  user_id: string;
  wallet_address: string;
  privy_wallet_id: string | null;
  privy_authorization_key: string | null;
  privy_authorization_expires_at: string | null;
}

function rowToUser(row: any): AppUser {
  return {
    user_id: String(row.user_id),
    auth_provider: String(row.auth_provider || "privy"),
    primary_wallet: row.primary_wallet == null ? null : String(row.primary_wallet),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    last_login_at:
      row.last_login_at instanceof Date
        ? row.last_login_at.toISOString()
        : String(row.last_login_at),
  };
}

export class UserService {
  constructor(private db: Pool = pool) {}

  async upsertPrivyUser(userId: string): Promise<AppUser> {
    const uid = userId.trim();
    if (!uid) throw new Error("user_id is required");
    const result = await this.db.query(
      `INSERT INTO app_users (user_id, auth_provider, created_at, updated_at, last_login_at)
       VALUES ($1, 'privy', NOW(), NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET auth_provider = EXCLUDED.auth_provider,
           updated_at = NOW(),
           last_login_at = NOW()
       RETURNING *`,
      [uid]
    );
    return rowToUser(result.rows[0]);
  }

  async setPrimaryWallet(userId: string, walletAddress: string): Promise<void> {
    const uid = userId.trim();
    const wallet = walletAddress.trim().toLowerCase();
    if (!uid || !wallet.startsWith("0x")) {
      throw new Error("valid user_id and wallet_address are required");
    }
    await this.db.query(
      `INSERT INTO app_users (user_id, auth_provider, primary_wallet, created_at, updated_at, last_login_at)
       VALUES ($1, 'privy', $2, NOW(), NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET primary_wallet = EXCLUDED.primary_wallet,
           updated_at = NOW()`,
      [uid, wallet]
    );
    await this.db.query(
      `UPDATE user_wallets
       SET is_primary = FALSE, updated_at = NOW()
       WHERE user_id = $1`,
      [uid]
    );
    await this.db.query(
      `INSERT INTO user_wallets (user_id, wallet_address, chain_type, is_primary, created_at, updated_at)
       VALUES ($1, $2, 'ethereum', TRUE, NOW(), NOW())
       ON CONFLICT (user_id, wallet_address) DO UPDATE
       SET is_primary = TRUE, updated_at = NOW()`,
      [uid, wallet]
    );
  }

  async upsertPrivyDelegatedWallet(input: {
    userId: string;
    walletAddress: string;
    privyWalletId: string | null;
    authorizationKey: string | null;
    authorizationExpiresAt: string | null;
  }): Promise<void> {
    const uid = input.userId.trim();
    const wallet = input.walletAddress.trim().toLowerCase();
    await this.db.query(
      `INSERT INTO app_users (user_id, auth_provider, primary_wallet, created_at, updated_at, last_login_at)
       VALUES ($1, 'privy', $2, NOW(), NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET primary_wallet = EXCLUDED.primary_wallet,
           updated_at = NOW(),
           last_login_at = NOW()`,
      [uid, wallet]
    );
    await this.db.query(
      `UPDATE user_wallets SET is_primary = FALSE, updated_at = NOW() WHERE user_id = $1`,
      [uid]
    );
    await this.db.query(
      `INSERT INTO user_wallets (
         user_id, wallet_address, privy_wallet_id, privy_authorization_key, privy_authorization_expires_at,
         chain_type, is_primary, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5::timestamptz, 'ethereum', TRUE, NOW(), NOW())
       ON CONFLICT (user_id, wallet_address) DO UPDATE
       SET privy_wallet_id = EXCLUDED.privy_wallet_id,
           privy_authorization_key = EXCLUDED.privy_authorization_key,
           privy_authorization_expires_at = EXCLUDED.privy_authorization_expires_at,
           is_primary = TRUE,
           updated_at = NOW()`,
      [
        uid,
        wallet,
        input.privyWalletId,
        input.authorizationKey,
        input.authorizationExpiresAt,
      ]
    );
  }

  async getUserById(userId: string): Promise<AppUser | null> {
    const result = await this.db.query(
      `SELECT * FROM app_users WHERE user_id = $1`,
      [userId]
    );
    if (!result.rows[0]) return null;
    return rowToUser(result.rows[0]);
  }

  async getPrimaryExecutionWallet(userId: string): Promise<UserExecutionWallet | null> {
    const result = await this.db.query(
      `SELECT
         user_id,
         wallet_address,
         privy_wallet_id,
         privy_authorization_key,
         privy_authorization_expires_at
       FROM user_wallets
       WHERE user_id = $1 AND is_primary = TRUE
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      user_id: String(row.user_id),
      wallet_address: String(row.wallet_address),
      privy_wallet_id: row.privy_wallet_id == null ? null : String(row.privy_wallet_id),
      privy_authorization_key:
        row.privy_authorization_key == null ? null : String(row.privy_authorization_key),
      privy_authorization_expires_at:
        row.privy_authorization_expires_at == null
          ? null
          : new Date(row.privy_authorization_expires_at).toISOString(),
    };
  }
}

