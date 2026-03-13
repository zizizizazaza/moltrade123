import { ethers } from "ethers";
import { CONTRACTS, CTF_ABI, ERC20_ABI, POLYGON_CHAIN_ID } from "../contracts";

export interface WalletBalances {
  pol: number;
  usdc_e: number;
}

function getRpcUrl(): string {
  const url = (
    process.env.POLYGON_RPC_URL ||
    process.env.CHAINSTACK_NODE ||
    ""
  ).trim();
  if (!url) throw new Error("POLYGON_RPC_URL or CHAINSTACK_NODE not set");
  return url;
}

export class WalletManager {
  private _provider: ethers.JsonRpcProvider | null = null;
  private _wallet: ethers.Wallet | null = null;
  private _address: string | null = null;
  private _rpcUrl: string;
  private _privateKey: string | null = null;

  constructor(rpcUrl?: string) {
    this._rpcUrl = (rpcUrl || process.env.POLYGON_RPC_URL || process.env.CHAINSTACK_NODE || "").trim();
    const pkRaw = (process.env.TRADING_PRIVATE_KEY || process.env.POLYCLAW_PRIVATE_KEY || "").trim();
    if (pkRaw) {
      const pk = pkRaw.startsWith("0x") ? pkRaw : "0x" + pkRaw;
      this._privateKey = pk;
      this._wallet = new ethers.Wallet(pk);
      this._address = this._wallet.address;
    }
  }

  get isUnlocked(): boolean {
    return this._privateKey != null;
  }

  get address(): string | null {
    return this._address;
  }

  private getProvider(): ethers.JsonRpcProvider {
    if (!this._rpcUrl) throw new Error("POLYGON_RPC_URL or CHAINSTACK_NODE not set");
    if (!this._provider) {
      this._provider = new ethers.JsonRpcProvider(this._rpcUrl, undefined, {
        staticNetwork: true,
      });
    }
    return this._provider;
  }

  private getWallet(): ethers.Wallet {
    if (!this._wallet) throw new Error("No wallet configured");
    const provider = this.getProvider();
    if (!this._wallet.provider) {
      this._wallet = this._wallet.connect(provider);
    }
    return this._wallet;
  }

  getUnlockedKey(): string {
    if (!this._privateKey) throw new Error("No wallet: set TRADING_PRIVATE_KEY");
    return this._privateKey;
  }

  /** 返回已连接 provider 的 Wallet，供链上交易（如 split）使用 */
  getConnectedWallet(): ethers.Wallet {
    return this.getWallet();
  }

  async getBalances(): Promise<WalletBalances> {
    if (!this._address) throw new Error("No wallet configured");
    const provider = this.getProvider();
    const polWei = await provider.getBalance(this._address);
    const pol = Number(ethers.formatEther(polWei));

    const usdc = new ethers.Contract(CONTRACTS.USDC_E, ERC20_ABI, provider);
    const usdcBalance = await usdc.balanceOf(this._address);
    const usdc_e = Number(ethers.formatUnits(usdcBalance, 6));
    return { pol, usdc_e };
  }

  async checkApprovals(): Promise<boolean> {
    if (!this._address) return false;
    const provider = this.getProvider();
    const usdc = new ethers.Contract(CONTRACTS.USDC_E, ERC20_ABI, provider);
    const ctf = new ethers.Contract(CONTRACTS.CTF, CTF_ABI, provider);

    for (const name of ["CTF", "CTF_EXCHANGE", "NEG_RISK_CTF_EXCHANGE"]) {
      const allowance = await usdc.allowance(this._address, (CONTRACTS as any)[name]);
      if (allowance === 0n) return false;
    }
    for (const name of ["CTF_EXCHANGE", "NEG_RISK_CTF_EXCHANGE", "NEG_RISK_ADAPTER"]) {
      const approved = await ctf.isApprovedForAll(this._address, (CONTRACTS as any)[name]);
      if (!approved) return false;
    }
    return true;
  }

  async setApprovals(): Promise<string[]> {
    const wallet = this.getWallet();
    const maxU = 2n ** 256n - 1n;
    const txHashes: string[] = [];

    const usdc = new ethers.Contract(CONTRACTS.USDC_E, ERC20_ABI, wallet);
    const ctf = new ethers.Contract(CONTRACTS.CTF, CTF_ABI, wallet);

    const approvals: { contract: ethers.Contract; method: string; spender: string; value: bigint | boolean }[] = [
      { contract: usdc, method: "approve", spender: CONTRACTS.CTF, value: maxU },
      { contract: usdc, method: "approve", spender: CONTRACTS.CTF_EXCHANGE, value: maxU },
      { contract: usdc, method: "approve", spender: CONTRACTS.NEG_RISK_CTF_EXCHANGE, value: maxU },
      { contract: ctf, method: "setApprovalForAll", spender: CONTRACTS.CTF_EXCHANGE, value: true },
      { contract: ctf, method: "setApprovalForAll", spender: CONTRACTS.NEG_RISK_CTF_EXCHANGE, value: true },
      { contract: ctf, method: "setApprovalForAll", spender: CONTRACTS.NEG_RISK_ADAPTER, value: true },
    ];

    for (const { contract, method, spender, value } of approvals) {
      const tx = await (contract as any)[method](spender, value, {
        gasLimit: 100_000,
      });
      const receipt = await tx.wait();
      if (receipt.status !== 1) throw new Error(`Approval failed: ${tx.hash}`);
      txHashes.push(tx.hash);
    }
    return txHashes;
  }
}
