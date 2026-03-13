"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Footer from "@/components/shared/Footer";
import { buildPurchaseTx, stringToField } from "@/lib/aleo";

// Mock data — same as marketplace
const mockListings: Record<string, {
  id: string; title: string; description: string; category: string;
  rowCount: number; price: number; seller: string; schemaPreview: string[];
  salesCount: number; deposit: number; blobHash: string;
}> = {
  "1": {
    id: "1", title: "DeFi Trading Patterns Q1 2026",
    description: "Aggregated trading patterns across major DEXs. Includes volume, frequency, and pair analysis. No wallet addresses exposed. Data covers 15 chains and 200+ trading pairs with hourly granularity.",
    category: "Finance", rowCount: 50000, price: 25, deposit: 5,
    seller: "aleo1qr2h4s8xgn7k3m9p0v5w8y1z6a4b7c0d3e6f9",
    schemaPreview: ["pair", "volume_24h", "trade_count", "avg_size", "spread", "chain", "timestamp"],
    salesCount: 12, blobHash: stringToField("demo_blob_1"),
  },
  "2": {
    id: "2", title: "Anonymous Health Survey — Sleep Patterns",
    description: "10K participant sleep study data. Fully anonymized. Verified by ZK proof of institutional origin. Includes sleep duration, quality metrics, REM analysis, and device correlation data.",
    category: "Healthcare", rowCount: 10000, price: 40, deposit: 10,
    seller: "aleo1m5n8k2j4h6g9f1d3s7a0p2o5i8u1y4t7r0e3w",
    schemaPreview: ["age_range", "sleep_hours", "quality_score", "rem_pct", "device_type", "region"],
    salesCount: 8, blobHash: stringToField("demo_blob_2"),
  },
  "3": {
    id: "3", title: "Social Engagement Metrics — Creator Economy",
    description: "Engagement rates, growth trends, and content performance metrics from 5K+ verified creators across platforms.",
    category: "Social", rowCount: 25000, price: 15, deposit: 5,
    seller: "aleo1x9c2v4b6n8m0k3j5h7g1f4d6s8a0p2o5i9u3y",
    schemaPreview: ["platform", "followers", "engagement_rate", "content_type", "growth_30d"],
    salesCount: 23, blobHash: stringToField("demo_blob_3"),
  },
  "4": {
    id: "4", title: "ML Training Set — Sentiment Analysis",
    description: "Labeled sentiment dataset for NLP model training. 100K+ entries with multi-language support.",
    category: "AI", rowCount: 100000, price: 60, deposit: 15,
    seller: "aleo1w3e5r7t9y1u3i5o7p9a2s4d6f8g0h2j4k6l8z",
    schemaPreview: ["text_hash", "sentiment", "confidence", "language", "source_type"],
    salesCount: 5, blobHash: stringToField("demo_blob_4"),
  },
  "5": {
    id: "5", title: "Urban Mobility Heatmaps — Q4 2025",
    description: "Aggregated movement patterns in 20 major cities. Privacy-preserving — no individual tracking.",
    category: "Geospatial", rowCount: 75000, price: 35, deposit: 8,
    seller: "aleo1a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s",
    schemaPreview: ["city", "zone", "hour", "density_score", "transport_mode"],
    salesCount: 17, blobHash: stringToField("demo_blob_5"),
  },
  "6": {
    id: "6", title: "DeFi Yield History — Top 50 Protocols",
    description: "Historical APY/APR data across lending, staking, and LP positions. Daily granularity.",
    category: "Finance", rowCount: 30000, price: 20, deposit: 5,
    seller: "aleo1z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h",
    schemaPreview: ["protocol", "pool", "apy", "tvl", "date", "chain"],
    salesCount: 31, blobHash: stringToField("demo_blob_6"),
  },
};

export default function ListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const listing = mockListings[id as string];
  const { address, executeTransaction, connected } = useWallet();
  const [purchasing, setPurchasing] = useState(false);
  const [txResult, setTxResult] = useState<string | null>(null);
  const [error, setError] = useState("");

  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 0.2 });
      tl.from(".listing-header", { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" })
        .from(".listing-body", { y: 40, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
        .from(".listing-sidebar", { y: 50, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.4");
    },
    { scope: pageRef }
  );

  const handlePurchase = async () => {
    if (!address || !executeTransaction || !listing) return;
    setPurchasing(true);
    setError("");

    try {
      const listingId = stringToField(listing.title + listing.id);

      const tx = buildPurchaseTx({
        listingId,
        seller: listing.seller,
        amount: listing.price,
        blobHash: listing.blobHash,
      });

      const result = await executeTransaction(tx);
      setTxResult(result?.transactionId || "submitted");
    } catch (err: any) {
      console.error("Purchase failed:", err);
      setError(err.message || "Transaction failed");
    } finally {
      setPurchasing(false);
    }
  };

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Listing not found</h1>
          <a href="/" className="text-accent hover:underline">Back to marketplace</a>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef}>
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="listing-header mb-8">
            <a href="/" className="text-sm text-muted hover:text-foreground transition-colors font-mono">
              &larr; Back to Marketplace
            </a>
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
                  Verified Data Properties
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-muted">Rows</span>
                    <p className="text-xl font-bold">{listing.rowCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Columns</span>
                    <p className="text-xl font-bold">{listing.schemaPreview.length}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Sales</span>
                    <p className="text-xl font-bold">{listing.salesCount}</p>
                  </div>
                </div>
              </div>

              {/* Schema */}
              <div className="glass-card rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
                  Schema
                </h3>
                <div className="flex flex-wrap gap-2">
                  {listing.schemaPreview.map((col) => (
                    <span
                      key={col}
                      className="text-sm font-mono px-3 py-1.5 rounded-lg bg-secondary border border-border text-text-secondary"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Privacy info */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
                  Privacy Model
                </h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: "Data contents", status: "Encrypted (AES-256)", private: true },
                    { label: "Buyer identity", status: "Hidden via ZK", private: true },
                    { label: "Transaction amount", status: "Private escrow", private: true },
                    { label: "Row count", status: "ZK Verified", private: false },
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
                  <span className="text-lg text-muted ml-2">ALEO</span>
                </div>

                {/* Transaction result */}
                {txResult && (
                  <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20">
                    <p className="text-xs text-accent font-semibold mb-1">Transaction Submitted</p>
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
                {!connected ? (
                  <div className="w-full py-4 text-center text-sm text-muted border border-border rounded-full mb-4">
                    Connect wallet to purchase
                  </div>
                ) : (
                  <motion.button
                    onClick={handlePurchase}
                    disabled={purchasing || !!txResult}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-accent text-black font-semibold rounded-full text-lg hover:bg-accent-dim transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {purchasing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : txResult ? (
                      "Purchased"
                    ) : (
                      "Purchase Dataset"
                    )}
                  </motion.button>
                )}

                <p className="text-xs text-muted text-center mb-6">
                  {listing.price} ALEO moves to private escrow via credits.aleo.
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
                    <span className="text-muted">Deposit staked</span>
                    <span className="font-medium">{listing.deposit} ALEO</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Total sales</span>
                    <span className="font-medium">{listing.salesCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Escrow</span>
                    <span className="text-accent font-mono text-xs">credits.aleo</span>
                  </div>
                </div>

                {/* Flow info */}
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Purchase Flow</h4>
                  <div className="space-y-2 text-xs text-text-secondary">
                    <div className="flex gap-2">
                      <span className="text-accent font-mono">1.</span>
                      <span>Your credits go to private escrow</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-accent font-mono">2.</span>
                      <span>Seller delivers encrypted data + key</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-accent font-mono">3.</span>
                      <span>You decrypt and verify the data</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-accent font-mono">4.</span>
                      <span>Confirm to release payment, or dispute</span>
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
