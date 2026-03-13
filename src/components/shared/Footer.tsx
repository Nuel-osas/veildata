"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-12">
          {/* Brand */}
          <div className="max-w-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-black font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-semibold">
                Veil<span className="text-accent">Data</span>
              </span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              The first confidential data marketplace powered by Aleo
              zero-knowledge proofs and Walrus decentralized storage.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <div className="flex flex-col gap-2">
                <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">Marketplace</Link>
                <Link href="/sell" className="text-sm text-muted hover:text-foreground transition-colors">Sell Data</Link>
                <Link href="/dashboard" className="text-sm text-muted hover:text-foreground transition-colors">Dashboard</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Built With</h4>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted">Aleo</span>
                <span className="text-sm text-muted">Walrus</span>
                <span className="text-sm text-muted">Shield Wallet</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">
            &copy; 2026 VeilData. Privacy is not a feature — it&apos;s the default.
          </p>
          <p className="text-xs text-muted font-mono">
            Powered by Aleo Zero-Knowledge Proofs
          </p>
        </div>
      </div>
    </footer>
  );
}
