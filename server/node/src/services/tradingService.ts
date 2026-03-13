import { ethers } from "ethers";
import { CONTRACTS, CTF_ABI, POLYGON_CHAIN_ID } from "../contracts";
import { MarketService } from "./marketService";
import { WalletManager } from "../trading/walletManager";
import { sellFok, sellFokWithSigner } from "../trading/clobClient";
import type { ClobSigner } from "@polymarket/clob-client";
import { PrivyService } from "./privyService";

function conditionIdToBytes32(conditionId: string): string {
  let hex = conditionId.replace(/^0x/i, "").trim();
  if (hex.length % 2) hex = "0" + hex;
  hex = hex.padStart(64, "0").slice(-64);
  return "0x" + hex;
}

export class TradingService {
  private marketService = new MarketService();
  private wallet: WalletManager | null = null;
  private privyService: PrivyService | null = null;

  private getWallet(): WalletManager {
    if (!this.wallet) this.wallet = new WalletManager();
    if (!this.wallet.isUnlocked) {
      throw new Error("Wallet not configured: set TRADING_PRIVATE_KEY and POLYGON_RPC_URL");
    }
    return this.wallet;
  }

  private async splitPosition(conditionId: string, amountUsd: number): Promise<string> {
    const w = this.getWallet();
    const wallet = w.getConnectedWallet();
    const ctf = new ethers.Contract(CONTRACTS.CTF, CTF_ABI, wallet);
    const usdcAddr = CONTRACTS.USDC_E;
    const parentCollection = "0x" + "00".repeat(32);
    const conditionBytes = conditionIdToBytes32(conditionId);
    const partition = [1, 2];
    const amountWei = BigInt(Math.floor(amountUsd * 1e6));

    const tx = await ctf.splitPosition(
      usdcAddr,
      parentCollection,
      conditionBytes,
      partition,
      amountWei,
      { gasLimit: 500_000 }
    );
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error(`split failed: ${tx.hash}`);
    return tx.hash;
  }

  private getPrivyService(): PrivyService {
    if (!this.privyService) this.privyService = new PrivyService();
    return this.privyService;
  }

  private findPrimaryType(types: Record<string, any>): string {
    const keys = Object.keys(types || {});
    const preferred = keys.find((k) => k !== "EIP712Domain");
    return preferred || "Order";
  }

  private makePrivyClobSigner(input: {
    walletAddress: string;
    walletId?: string | null;
  }): ClobSigner {
    const walletAddress = input.walletAddress.toLowerCase();
    const walletId = input.walletId || null;
    const privy = this.getPrivyService().getConfiguredSignerClient();
    return {
      getAddress: async () => walletAddress,
      _signTypedData: async (
        domain: Record<string, unknown>,
        types: Record<string, Array<{ name: string; type: string }>>,
        value: Record<string, unknown>
      ) => {
        const typedData = {
          domain,
          types,
          message: value,
          primaryType: this.findPrimaryType(types as Record<string, any>),
        };
        const payload = walletId
          ? { walletId, typedData }
          : { address: walletAddress, chainType: "ethereum" as const, typedData };
        const sig = await privy.walletApi.ethereum.signTypedData(payload as any);
        return sig.signature;
      },
    };
  }

  private async splitPositionWithPrivyWallet(input: {
    walletAddress: string;
    walletId?: string | null;
    conditionId: string;
    amountUsd: number;
  }): Promise<string> {
    const iface = new ethers.Interface(CTF_ABI);
    const usdcAddr = CONTRACTS.USDC_E;
    const parentCollection = "0x" + "00".repeat(32);
    const conditionBytes = conditionIdToBytes32(input.conditionId);
    const partition = [1, 2];
    const amountWei = BigInt(Math.floor(input.amountUsd * 1e6));
    const data = iface.encodeFunctionData("splitPosition", [
      usdcAddr,
      parentCollection,
      conditionBytes,
      partition,
      amountWei,
    ]);
    const privy = this.getPrivyService().getConfiguredSignerClient();
    const payload = input.walletId
      ? {
          walletId: input.walletId,
          caip2: `eip155:${POLYGON_CHAIN_ID}` as const,
          transaction: {
            to: CONTRACTS.CTF as `0x${string}`,
            data: data as `0x${string}`,
            gasLimit: 500_000,
          },
        }
      : {
          address: input.walletAddress.toLowerCase(),
          chainType: "ethereum" as const,
          caip2: `eip155:${POLYGON_CHAIN_ID}` as const,
          transaction: {
            to: CONTRACTS.CTF as `0x${string}`,
            data: data as `0x${string}`,
            gasLimit: 500_000,
          },
        };
    const tx = await privy.walletApi.ethereum.sendTransaction(payload as any);
    return String((tx as any).hash || "");
  }

  async buyPosition(
    marketId: string,
    side: string,
    amountUsd: number,
    options: { skipSell?: boolean } = {}
  ): Promise<{
    success: boolean;
    split_tx_hash?: string;
    order_id?: string | null;
    side: string;
    amount_usd: number;
    message?: string;
  }> {
    const s = String(side).trim().toUpperCase();
    if (s !== "YES" && s !== "NO") {
      throw new Error("side must be YES or NO");
    }

    const market = await this.marketService.getMarketForTrade(marketId);
    if (!market) {
      throw new Error(`market not found or missing trade data: ${marketId}`);
    }

    const { condition_id, yes_token_id, no_token_id, yes_price, no_price } = market;
    const wantedToken = s === "YES" ? yes_token_id : no_token_id;
    const unwantedToken = s === "YES" ? no_token_id : yes_token_id;
    const unwantedPrice = s === "YES" ? no_price : yes_price;

    const splitTxHash = await this.splitPosition(condition_id, amountUsd);
    await new Promise((r) => setTimeout(r, 2000));

    let orderId: string | null = null;
    if (!options.skipSell) {
      const result = await sellFok(unwantedToken, amountUsd, unwantedPrice);
      orderId = result.orderId;
      if (!result.success) {
        return {
          success: false,
          message: `split ok, sell failed: ${result.error}`,
          split_tx_hash: splitTxHash,
          order_id: null,
          side: s,
          amount_usd: amountUsd,
        };
      }
    }

    return {
      success: true,
      split_tx_hash: splitTxHash,
      order_id: orderId,
      side: s,
      amount_usd: amountUsd,
    };
  }

  async buyPositionWithPrivyWallet(input: {
    walletAddress: string;
    walletId?: string | null;
    marketId: string;
    side: string;
    amountUsd: number;
    options?: { skipSell?: boolean };
  }): Promise<{
    success: boolean;
    split_tx_hash?: string;
    order_id?: string | null;
    side: string;
    amount_usd: number;
    message?: string;
  }> {
    const s = String(input.side).trim().toUpperCase();
    if (s !== "YES" && s !== "NO") {
      throw new Error("side must be YES or NO");
    }
    const market = await this.marketService.getMarketForTrade(input.marketId);
    if (!market) {
      throw new Error(`market not found or missing trade data: ${input.marketId}`);
    }
    const { condition_id, yes_token_id, no_token_id, yes_price, no_price } = market;
    const unwantedToken = s === "YES" ? no_token_id : yes_token_id;
    const unwantedPrice = s === "YES" ? no_price : yes_price;

    const splitTxHash = await this.splitPositionWithPrivyWallet({
      walletAddress: input.walletAddress,
      walletId: input.walletId,
      conditionId: condition_id,
      amountUsd: input.amountUsd,
    });
    await new Promise((r) => setTimeout(r, 2000));

    let orderId: string | null = null;
    if (!input.options?.skipSell) {
      const signer = this.makePrivyClobSigner({
        walletAddress: input.walletAddress,
        walletId: input.walletId,
      });
      const result = await sellFokWithSigner(
        unwantedToken,
        input.amountUsd,
        unwantedPrice,
        signer,
        `privy:${(input.walletId || input.walletAddress).toLowerCase()}`
      );
      orderId = result.orderId;
      if (!result.success) {
        return {
          success: false,
          message: `split ok, sell failed: ${result.error}`,
          split_tx_hash: splitTxHash,
          order_id: null,
          side: s,
          amount_usd: input.amountUsd,
        };
      }
    }
    return {
      success: true,
      split_tx_hash: splitTxHash,
      order_id: orderId,
      side: s,
      amount_usd: input.amountUsd,
    };
  }
}
