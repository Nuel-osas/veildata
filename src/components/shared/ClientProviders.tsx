"use client";

import { ReactNode, useMemo } from "react";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { Network } from "@provablehq/aleo-types";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";

import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

export default function ClientProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new ShieldWalletAdapter()], []);

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.AutoDecrypt}
      network={Network.TESTNET}
      autoConnect
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </AleoWalletProvider>
  );
}
