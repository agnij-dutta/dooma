import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { ogGalileoTestnet } from "./chain";

/**
 * wagmi + RainbowKit config pinned to 0G Galileo testnet (chain 16602).
 * WalletConnect project id is optional for local injected-wallet dev.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "DOOMA",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "verdict-dev",
  chains: [ogGalileoTestnet],
  ssr: true,
});
