"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Footer from "@/components/shared/Footer";
import { buildPurchaseTx, stringToField } from "@/lib/aleo";
import { fetchListing, createPurchase, fetchPurchases, ListingRecord } from "@/lib/listings";

export default function ListingPage() {
  const { id } = useParams();
  const pageRef = useRef<HTMLDivElement>(null);
  const { address, executeTransaction, connected } = useWallet();
  const [listing, setListing] = useState<ListingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [txResult, setTxResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [alreadyBought, setAlreadyBought] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchListing(id as string).then((found) => {
      if (cancelled) return;
      setListing(found);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!address || !listing) return;
    let cancelled = false;
    fetchPurchases(address).then((purchases) => {
      if (cancelled) return;
      const bought = purchases.some((p) => p.listingId === listing.listingId);
      setAlreadyBought(bought);
    });
    return () => { cancelled = true; };
  }, [address, listing?.listingId]);

  const [animationPlayed, setAnimationPlayed] = useState(false);

  useGSAP(
    () => {
      if (!listing || animationPlayed) return;
      setAnimationPlayed(true);
      const tl = gsap.timeline({ delay: 0.2 });
      tl.from(".listing-header", { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" })
        .from(".listing-body", { y: 40, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
        .from(".listing-sidebar", { y: 50, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.4");
    },
    { scope: pageRef, dependencies: [listing, animationPlayed] }
  );

  const handlePurchase = async () => {
    if (!address || !executeTransaction || !listing) return;
    setPurchasing(true);
    setError("");

    try {
      // Call veildatamarketv3.aleo/purchase — handles USDCx escrow on-chain
      const blobHash = stringToField(listing.blobId);
      const purchaseTx = buildPurchaseTx({
        listingId: listing.listingId,
        seller: listing.seller,
        amount: listing.price,
        blobHash,
      });

      console.log("=== PURCHASE TX ===", JSON.stringify(purchaseTx, null, 2));

      const result = await executeTransaction(purchaseTx);
      if (!result?.transactionId) {
        throw new Error("Transaction was rejected by wallet");
      }
      console.log("Purchase wallet response:", result);

      // Poll for on-chain confirmation via listing_status mapping
      const apiBase = process.env.NEXT_PUBLIC_ALEO_API || "https://api.explorer.provable.com/v1";
      const network = process.env.NEXT_PUBLIC_ALEO_NETWORK || "testnet";
      const programId = process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID || "veildatamarketv3.aleo";

      let confirmed = false;
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        try {
          const res = await fetch(`${apiBase}/${network}/program/${programId}/mapping/listing_status/${listing.listingId}`);
          const raw = await res.text();
          // Status 2u8 means purchased
          if (raw && raw.includes("2")) {
            confirmed = true;
            break;
          }
        } catch {
          // keep polling
        }
      }

      if (!confirmed) {
        throw new Error("Purchase not confirmed on-chain yet. It may still be processing — check your dashboard in a few minutes.");
      }

      setTxResult(result.transactionId);

      // Record the purchase in database
      await createPurchase({
        listingId: listing.listingId,
        buyer: address,
        seller: listing.seller,
        amount: listing.price,
        blobHash,
        txId: result.transactionId,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Transaction was rejected by wallet";
      console.error("Purchase failed:", err);
      setError(message);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Listing not found</h1>
          <p className="text-muted mb-4">This listing doesn&apos;t exist or hasn&apos;t been indexed yet.</p>
          <Link href="/marketplace" className="text-accent hover:underline">
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  const schemaFields = listing.schemaFields.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div ref={pageRef}>
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="listing-header mb-8">
            <Link href="/marketplace" className="text-sm text-muted hover:text-foreground transition-colors font-mono">
              &larr; Back to Marketplace
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content */}
            <div className="listing-body flex-1">
              {/* Category badge */}
              <span className="inline-block text-xs font-mono px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent mb-4">
                {listing.category}
              </span>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {listing.title}
              </h1>

              <p className="text-text-secondary text-lg leading-relaxed mb-8">
                {listing.description}
              </p>

              {/* Data Properties */}
              <div className="glass-card rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
                  Data Properties
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-muted">Rows</span>
                    <p className="text-xl font-bold">{listing.rowCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Columns</span>
                    <p className="text-xl font-bold">{schemaFields.length}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Storage</span>
                    <p className="text-xl font-bold">Walrus</p>
                  </div>
                </div>
              </div>

              {/* Schema */}
              <div className="glass-card rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
                  Schema
                </h3>
                <div className="flex flex-wrap gap-2">
                  {schemaFields.map((col) => (
                    <span
                      key={col}
                      className="text-sm font-mono px-3 py-1.5 rounded-lg bg-secondary border border-border text-text-secondary"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* On-chain info */}
              <div className="glass-card rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
                  On-Chain Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-text-secondary">Program</span>
                    <span className="font-mono text-xs text-accent">veildatamarketv3.aleo</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-text-secondary">Listing ID</span>
                    <span className="font-mono text-xs text-muted">{listing.listingId.slice(0, 20)}...</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-text-secondary">Blob ID (Walrus)</span>
                    <span className="font-mono text-xs text-muted">{listing.blobId.slice(0, 20)}...</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-text-secondary">Create Tx</span>
                    <span className="font-mono text-xs text-muted">{listing.txId.slice(0, 20)}...</span>
                  </div>
                </div>
              </div>

              {/* Privacy info */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
                  Privacy Model
                </h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: "Data contents", status: "Encrypted (AES-256-GCM)", private: true },
                    { label: "Buyer identity", status: "Hidden via ZK", private: true },
                    { label: "Payment amount", status: "USDCx escrow (on-chain)", private: true },
                    { label: "Row count", status: "Public (on-chain)", private: false },
                    { label: "Schema structure", status: "Public", private: false },
                    { label: "Storage", status: "Walrus (decentralized)", private: false },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-text-secondary">{item.label}</span>
                      <span className={`font-mono text-xs ${item.private ? "text-accent" : "text-muted"}`}>
                        {item.private ? "🔒" : "📋"} {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="listing-sidebar lg:w-80 shrink-0">
              <div className="glass-card rounded-2xl p-6 lg:sticky lg:top-28">
                {/* Price */}
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-accent">{listing.price}</span>
                  <span className="text-lg text-muted ml-2">USDCx</span>
                </div>

                {/* Transaction result */}
                {txResult && (
                  <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20">
                    <p className="text-xs text-accent font-semibold mb-1">Purchase Submitted</p>
                    <p className="text-xs text-muted font-mono break-all">{txResult}</p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Buy button */}
                {alreadyBought || txResult ? (
                  <div className="w-full py-4 text-center text-sm text-accent border border-accent/30 bg-accent/5 rounded-full mb-4">
                    Purchased
                  </div>
                ) : !connected ? (
                  <div className="w-full py-4 text-center text-sm text-muted border border-border rounded-full mb-4">
                    Connect Shield Wallet to purchase
                  </div>
                ) : address === listing.seller ? (
                  <div className="w-full py-4 text-center text-sm text-muted border border-border rounded-full mb-4">
                    This is your listing
                  </div>
                ) : (
                  <motion.button
                    onClick={handlePurchase}
                    disabled={purchasing || !!txResult || alreadyBought}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-accent text-black font-semibold rounded-full text-lg hover:bg-accent-dim transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {purchasing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Approve in Shield Wallet...
                      </span>
                    ) : txResult ? (
                      "Purchased"
                    ) : (
                      "Purchase Dataset"
                    )}
                  </motion.button>
                )}

                <p className="text-xs text-muted text-center mb-6">
                  {listing.price} USDCx moves to escrow via test_usdcx_stablecoin.aleo.
                  Released to seller after you confirm delivery.
                </p>

                {/* Seller info */}
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Seller</span>
                    <span className="font-mono text-xs">
                      {listing.seller.slice(0, 10)}...
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Escrow</span>
                    <span className="text-accent font-mono text-xs">USDCx escrow</span>
                  </div>
                </div>

                {/* Flow info */}
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Purchase Flow</h4>
                  <div className="space-y-2 text-xs text-text-secondary">
                    <div className="flex gap-2">
                      <span className="text-accent font-mono">1.</span>
                      <span>Sign transaction — USDCx goes to on-chain escrow</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-accent font-mono">2.</span>
                      <span>Seller delivers encrypted data + decryption key</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-accent font-mono">3.</span>
                      <span>You decrypt and verify the data</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-accent font-mono">4.</span>
                      <span>Confirm to release payment, or dispute for refund</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
