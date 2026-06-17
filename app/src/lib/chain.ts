import { defineChain } from "viem";

/**
 * 0G Galileo testnet — chain id 16602 (CONFIRMED from SDK constants; the
 * chainlist "16601" was wrong). Currency symbol: OG.
 */
export const ogGalileoTestnet = defineChain({
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "OG", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai"],
    },
  },
  blockExplorers: {
    default: { name: "0G Explorer", url: "https://chainscan-galileo.0g.ai" },
  },
  testnet: true,
});

export const DEFAULT_PROVIDER =
  process.env.NEXT_PUBLIC_DEFAULT_PROVIDER ??
  "0xa48f01287233509FD694a22Bf840225062E67836";
