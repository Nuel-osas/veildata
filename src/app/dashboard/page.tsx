"use client";

import { useState, useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Footer from "@/components/shared/Footer";
import { buildConfirmReceiptTx, buildDisputeTx, buildDeliverTx, buildClaimTimeoutRefundTx, stringToField } from "@/lib/aleo";
import {
  fetchListings,
  fetchPurchases,
  fetchEncryptionKey,
  ListingRecord,
  PurchaseRecord,
} from "@/lib/listings";
import { unpackKey, keyToFields } from "@/lib/crypto";
import Link from "next/link";

type Tab = "purchases" | "listings";

export default function DashboardPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("purchases");
  const { address, executeTransaction, connected } = useWallet();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myListings, setMyListings] = useState<ListingRecord[]>([]);
  const [myPurchases, setMyPurchases] = useState<PurchaseRecord[]>([]);

  useEffect(() => {
    fetchListings().then(setMyListings);
    if (address) {
      fetchPurchases(address).then(setMyPurchases);
    }
  }, [address]);

  const userListings = address
    ? myListings.filter((l) => l.seller === address)
    : myListings;

  const totalEarned = userListings.reduce((sum, l) => sum + l.price, 0);
  const totalSpent = myPurchases.reduce((sum, p) => sum + p.amount, 0);

  useGSAP(
    () => {
      gsap.from(".dash-header", { y: 30, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.2 });
      gsap.from(".dash-stats", { y: 40, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.1, delay: 0.3 });
      gsap.from(".dash-content", { y: 50, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.5 });
    },
    { scope: pageRef }
  );

  const handleConfirm = async () => {
    if (!address || !executeTransaction) return;
    setActionLoading("confirm");
    try {
      const tx = buildConfirmReceiptTx();
      await executeTransaction(tx);
    } catch (err) {
      console.error("Confirm failed:", err);
    }
    setActionLoading(null);
  };

  const handleDispute = async () => {
    if (!address || !executeTransaction) return;
    setActionLoading("dispute");
    try {
      const tx = buildDisputeTx();
      await executeTransaction(tx);
    } catch (err) {
      console.error("Dispute failed:", err);
    }
    setActionLoading(null);
  };

  const handleDeliver = async (listing: ListingRecord) => {
    if (!address || !executeTransaction) return;
    setActionLoading(`deliver-${listing.listingId}`);
    try {
      const packedKey = await fetchEncryptionKey(listing.listingId, address);
      if (!packedKey) throw new Error("Encryption key not found");

      const { key } = unpackKey(packedKey);
      const [keyField1, keyField2] = keyToFields(key);
      const blobId1 = stringToField(listing.blobId);
      const blobId2 = stringToField(listing.blobId + "_iv");

      const tx = buildDeliverTx({
        blobId1,
        blobId2,
        decryptionKey1: keyField1,
        decryptionKey2: keyField2,
      });
      await executeTransaction(tx);
    } catch (err) {
      console.error("Deliver failed:", err);
    }
    setActionLoading(null);
  };

  const handleClaimTimeout = async () => {
    if (!address || !executeTransaction) return;
    setActionLoading("timeout");
    try {
      const tx = buildClaimTimeoutRefundTx();
      await executeTransaction(tx);
    } catch (err) {
      console.error("Timeout refund failed:", err);
    }
    setActionLoading(null);
  };

  return (
    <div ref={pageRef}>
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="dash-header mb-10">
            <span className="text-xs font-mono text-accent uppercase tracking-widest">
              Dashboard
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mt-3">
              Your activity
            </h1>
            {!connected && (
              <p className="text-muted mt-2 text-sm">
                Connect Shield Wallet to see your activity.
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Purchases", value: myPurchases.length.toString() },
              { label: "Listings", value: userListings.length.toString() },
              { label: "Listed Value", value: totalEarned > 0 ? `${totalEarned} ALEO` : "—" },
              { label: "Spent", value: totalSpent > 0 ? `${totalSpent} ALEO` : "—" },
            ].map((stat) => (
              <div key={stat.label} className="dash-stats glass-card rounded-xl p-5">
                <span className="text-xs text-muted">{stat.label}</span>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="dash-content">
            <div className="flex gap-1 border-b border-border mb-8">
              {(["purchases", "listings"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                    tab === t
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Purchases Tab */}
            {tab === "purchases" && (
              <div className="space-y-4">
                {myPurchases.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted mb-4">No purchases yet.</p>
                    <Link
                      href="/"
                      className="text-accent hover:underline text-sm"
                    >
                      Browse the marketplace
                    </Link>
                  </div>
                ) : (
                  myPurchases.map((p) => (
                    <motion.div
                      key={p.txId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-semibold">Listing {p.listingId.slice(0, 12)}...</h3>
                        <p className="text-xs text-muted mt-1">
                          {new Date(p.createdAt).toLocaleDateString()} · Tx: {p.txId.slice(0, 16)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-accent font-bold">{p.amount} ALEO</span>
                        <span className="text-xs font-mono px-2.5 py-1 rounded-full text-yellow-400 bg-yellow-400/10">
                          in escrow
                        </span>
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => handleConfirm()}
                            disabled={actionLoading === "confirm"}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 bg-accent text-black text-xs font-semibold rounded-full disabled:opacity-50"
                          >
                            {actionLoading === "confirm" ? "..." : "Confirm"}
                          </motion.button>
                          <motion.button
                            onClick={() => handleDispute()}
                            disabled={actionLoading === "dispute"}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 border border-red-500/30 text-red-400 text-xs font-semibold rounded-full disabled:opacity-50"
                          >
                            {actionLoading === "dispute" ? "..." : "Dispute"}
                          </motion.button>
                          <motion.button
                            onClick={() => handleClaimTimeout()}
                            disabled={actionLoading === "timeout"}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 border border-orange-500/30 text-orange-400 text-xs font-semibold rounded-full disabled:opacity-50"
                          >
                            {actionLoading === "timeout" ? "..." : "Claim Timeout"}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Listings Tab */}
            {tab === "listings" && (
              <div className="space-y-4">
                {userListings.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted mb-4">You haven&apos;t listed any data yet.</p>
                    <Link
                      href="/sell"
                      className="inline-block px-6 py-3 bg-accent text-black font-semibold rounded-full hover:bg-accent-dim transition-colors"
                    >
                      List Your Data
                    </Link>
                  </div>
                ) : (
                  userListings.map((l) => (
                    <motion.div
                      key={l.listingId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <Link href={`/listing/${l.listingId}`} className="font-semibold hover:text-accent transition-colors">
                          {l.title}
                        </Link>
                        <p className="text-xs text-muted mt-1">
                          {new Date(l.createdAt).toLocaleDateString()} · {l.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-accent font-bold">{l.price} ALEO</span>
                        <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${
                          l.status === "active"
                            ? "text-green-400 bg-green-400/10"
                            : l.status === "delivered"
                            ? "text-blue-400 bg-blue-400/10"
                            : "text-yellow-400 bg-yellow-400/10"
                        }`}>
                          {l.status}
                        </span>
                        {l.status === "active" && l.hasEncryptionKey && (
                          <motion.button
                            onClick={() => handleDeliver(l)}
                            disabled={actionLoading === `deliver-${l.listingId}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 bg-accent text-black text-xs font-semibold rounded-full disabled:opacity-50"
                          >
                            {actionLoading === `deliver-${l.listingId}` ? "..." : "Deliver Key"}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
