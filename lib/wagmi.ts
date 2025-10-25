import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { celoSepoliaTestnet, sepolia } from './config'

export const config = getDefaultConfig({
  appName: "SwapX",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_WALLETCONNECT_PROJECT_ID", // You'll need to get this from WalletConnect
  chains: [celoSepoliaTestnet, sepolia],
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}