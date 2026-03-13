import { PrivyClient } from "@privy-io/server-auth";

export interface PrivyDelegatedWallet {
  id: string;
  address: string;
  chainType: string;
}

export class PrivyService {
  private appId: string;
  private appSecret: string;
  private authorizationPrivateKey: string;

  constructor() {
    this.appId = (process.env.PRIVY_APP_ID || "").trim();
    this.appSecret = (process.env.PRIVY_APP_SECRET || "").trim();
    this.authorizationPrivateKey = (
      process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY || ""
    ).trim();
    if (!this.appId || !this.appSecret) {
      throw new Error("PRIVY_APP_ID or PRIVY_APP_SECRET is not set");
    }
  }

  private getBaseClient(): PrivyClient {
    return new PrivyClient(this.appId, this.appSecret);
  }

  getClientWithAuthorizationKey(authorizationKey: string): PrivyClient {
    return new PrivyClient(this.appId, this.appSecret, {
      walletApi: {
        authorizationPrivateKey: authorizationKey,
      },
    });
  }

  getConfiguredSignerClient(): PrivyClient {
    if (!this.authorizationPrivateKey) {
      throw new Error("PRIVY_AUTHORIZATION_PRIVATE_KEY is not set");
    }
    return this.getClientWithAuthorizationKey(this.authorizationPrivateKey);
  }

  async getDelegatedWalletsByUserId(userId: string): Promise<PrivyDelegatedWallet[]> {
    const client = this.getBaseClient();
    const user = await client.getUser(userId);
    const linkedAccounts = Array.isArray((user as any)?.linkedAccounts)
      ? (user as any).linkedAccounts
      : [];
    return linkedAccounts
      .filter((account: any) => account?.type === "wallet" && account?.delegated === true)
      .map((account: any) => ({
        id: String(account?.id || ""),
        address: String(account?.address || "").toLowerCase(),
        chainType: String(account?.chainType || account?.chain_type || ""),
      }))
      .filter((wallet: PrivyDelegatedWallet) => Boolean(wallet.id && wallet.address));
  }
}

