import { ClobClient, OrderType, Side } from "@polymarket/clob-client";
import type { Chain } from "@polymarket/clob-client";
import type { ClobSigner } from "@polymarket/clob-client";
import { ethers } from "ethers";

const CLOB_HOST = "https://clob.polymarket.com";
const POLYGON_CHAIN_ID = 137;


function ethersV6SignerAdapter(wallet: ethers.Wallet): ClobSigner {
  return {
    getAddress: () => Promise.resolve(wallet.address),
    _signTypedData: async (
      domain: Record<string, unknown>,
      types: Record<string, Array<{ name: string; type: string }>>,
      value: Record<string, unknown>
    ) => {
      const sig = await wallet.signTypedData(
        domain as any,
        types as any,
        value as any
      );
      return sig;
    },
  };
}

function getPrivateKey(): string {
  let pk =
    process.env.TRADING_PRIVATE_KEY || process.env.POLYCLAW_PRIVATE_KEY || "";
  if (!pk.trim()) throw new Error("TRADING_PRIVATE_KEY or POLYCLAW_PRIVATE_KEY not set");
  return pk.startsWith("0x") ? pk : "0x" + pk;
}

let cachedClient: ClobClient | null = null;
let cachedCreds: any = null;
const delegatedCache = new Map<string, { client: ClobClient; creds: any }>();

async function getClobClient(): Promise<ClobClient> {
  if (cachedClient && cachedCreds) return cachedClient;
  const pk = getPrivateKey();
  const wallet = new ethers.Wallet(pk);
  const signer = ethersV6SignerAdapter(wallet);
  const tempClient = new ClobClient(
    CLOB_HOST,
    POLYGON_CHAIN_ID as Chain,
    signer
  );
  const creds = await tempClient.createOrDeriveApiKey();
  cachedCreds = creds;
  cachedClient = new ClobClient(
    CLOB_HOST,
    POLYGON_CHAIN_ID as Chain,
    signer,
    creds
  );
  return cachedClient;
}

export async function getClobClientWithSigner(
  signer: ClobSigner,
  cacheKey: string
): Promise<ClobClient> {
  const key = cacheKey.trim();
  const existed = delegatedCache.get(key);
  if (existed) return existed.client;
  const tempClient = new ClobClient(
    CLOB_HOST,
    POLYGON_CHAIN_ID as Chain,
    signer
  );
  const creds = await tempClient.createOrDeriveApiKey();
  const client = new ClobClient(
    CLOB_HOST,
    POLYGON_CHAIN_ID as Chain,
    signer,
    creds
  );
  delegatedCache.set(key, { client, creds });
  return client;
}


export async function sellFok(
  tokenId: string,
  amount: number,
  price: number,
  priceDiscount: number = 0.9
): Promise<{ orderId: string | null; success: boolean; error: string | null }> {
  const sellPrice = Math.max(price * priceDiscount, 0.01);
  const rounded = Math.round(sellPrice * 100) / 100;
  try {
    const client = await getClobClient();
    const order = await client.createOrder({
      tokenID: tokenId,
      price: rounded,
      size: amount,
      side: Side.SELL,
    });
    const result = await client.postOrder(order, OrderType.FOK);
    const orderId =
      result && typeof result === "object" && "orderID" in result
        ? String((result as any).orderID)
        : String(result).slice(0, 40);
    return { orderId, success: true, error: null };
  } catch (e: any) {
    return {
      orderId: null,
      success: false,
      error: e?.message ?? String(e),
    };
  }
}

export async function sellFokWithSigner(
  tokenId: string,
  amount: number,
  price: number,
  signer: ClobSigner,
  cacheKey: string,
  priceDiscount: number = 0.9
): Promise<{ orderId: string | null; success: boolean; error: string | null }> {
  const sellPrice = Math.max(price * priceDiscount, 0.01);
  const rounded = Math.round(sellPrice * 100) / 100;
  try {
    const client = await getClobClientWithSigner(signer, cacheKey);
    const order = await client.createOrder({
      tokenID: tokenId,
      price: rounded,
      size: amount,
      side: Side.SELL,
    });
    const result = await client.postOrder(order, OrderType.FOK);
    const orderId =
      result && typeof result === "object" && "orderID" in result
        ? String((result as any).orderID)
        : String(result).slice(0, 40);
    return { orderId, success: true, error: null };
  } catch (e: any) {
    return {
      orderId: null,
      success: false,
      error: e?.message ?? String(e),
    };
  }
}
