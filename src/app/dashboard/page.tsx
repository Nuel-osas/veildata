"use client";

import { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Footer from "@/components/shared/Footer";
import { buildConfirmReceiptTx, buildDisputeTx } from "@/lib/aleo";

type Tab = "purchases" | "listings" | "activity";

const mockPurchases = [
  { id: "1", title: "DeFi Trading Patterns Q1 2026", price: 25, status: "delivered", date: "2026-03-10" },
  { id: "2", title: "Anonymous Health Survey", price: 40, status: "escrowed", date: "2026-03-12" },
];

const mockMyListings = [
  { id: "3", title: "Social Engagement Metrics", price: 15, status: "active", sales: 23, date: "2026-02-28" },
  { id: "4", title: "ML Training Set — Sentiment", price: 60, status: "active", sales: 5, date: "2026-03-05" },
];

const statusColors: Record<string, string> = {
  active: "text-green-400 bg-green-400/10",
  escrowed: "text-yellow-400 bg-yellow-400/10",
  delivered: "text-accent bg-accent/10",
  completed: "text-blue-400 bg-blue-400/10",
  disputed: "text-red-400 bg-red-400/10",
};

export default function DashboardPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("purchases");
  const { address, executeTransaction, connected } = useWallet();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleConfirm = async (escrowRecord: string) => {
    if (!address || !executeTransaction) return;
    setActionLoading("confirm");
    try {
      const tx = buildConfirmReceiptTx(escrowRecord);
      await executeTransaction(tx);
    } catch (err) {
      console.error("Confirm failed:", err);
    }
    setActionLoading(null);
  };

  const handleDispute = async (escrowRecord: string) => {
    if (!address || !executeTransaction) return;
    setActionLoading("dispute");
    try {
      const tx = buildDisputeTx(escrowRecord);
      await executeTransaction(tx);
    } catch (err) {
      console.error("Dispute failed:", err);
    }
    setActionLoading(null);
  };

  useGSAP(
    () => {
      gsap.from(".dash-header", { y: 30, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.2 });
      gsap.from(".dash-stats", { y: 40, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.1, delay: 0.3 });
      gsap.from(".dash-content", { y: 50, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.5 });
    },
    { scope: pageRef }
  );

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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Purchases", value: "2" },
              { label: "Listings", value: "2" },
              { label: "Earned", value: "345 ALEO" },
              { label: "Spent", value: "65 ALEO" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="dash-stats glass-card rounded-xl p-5"
              >
                <span className="text-xs text-muted">{stat.label}</span>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="dash-content">
            <div className="flex gap-1 border-b border-border mb-8">
              {(["purchases", "listings", "activity"] as Tab[]).map((t) => (
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
                {mockPurchases.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="text-xs text-muted mt-1">{p.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-accent font-bold">{p.price} ALEO</span>
                      <span
                        className={`text-xs font-mono px-2.5 py-1 rounded-full capitalize ${
                          statusColors[p.status] || ""
                        }`}
                      >
                        {p.status}
                      </span>
                      {p.status === "delivered" && (
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => handleConfirm("ESCROW_RECORD_PLACEHOLDER")}
                            disabled={actionLoading === "confirm"}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 bg-accent text-black text-xs font-semibold rounded-full disabled:opacity-50"
                          >
                            {actionLoading === "confirm" ? "..." : "Confirm & Release"}
                          </motion.button>
                          <motion.button
                            onClick={() => handleDispute("ESCROW_RECORD_PLACEHOLDER")}
                            disabled={actionLoading === "dispute"}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 border border-red-500/30 text-red-400 text-xs font-semibold rounded-full disabled:opacity-50"
                          >
                            {actionLoading === "dispute" ? "..." : "Dispute"}
                          </motion.button>
                        </div>
                      )}
                      {p.status === "escrowed" && (
                        <span className="text-xs text-yellow-400 font-mono">
                          Awaiting delivery...
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Listings Tab */}
            {tab === "listings" && (
              <div className="space-y-4">
                {mockMyListings.map((l) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-semibold">{l.title}</h3>
                      <p className="text-xs text-muted mt-1">
                        Listed {l.date} · {l.sales} sales
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-accent font-bold">{l.price} ALEO</span>
                      <span
                        className={`text-xs font-mono px-2.5 py-1 rounded-full capitalize ${
                          statusColors[l.status] || ""
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Activity Tab */}
            {tab === "activity" && (
              <div className="space-y-3">
                {[
                  { action: "Purchased", item: "DeFi Trading Patterns", time: "2 days ago", type: "buy" },
                  { action: "Listed", item: "ML Training Set — Sentiment", time: "5 days ago", type: "sell" },
                  { action: "Received payment", item: "Social Engagement Metrics", time: "1 week ago", type: "earn" },
                  { action: "Confirmed delivery", item: "Urban Mobility Heatmaps", time: "2 weeks ago", type: "confirm" },
                ].map((activity, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 py-3 border-b border-border last:border-0"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        activity.type === "buy"
                          ? "bg-blue-500/10 text-blue-400"
                          : activity.type === "sell"
                          ? "bg-accent/10 text-accent"
                          : activity.type === "earn"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-purple-500/10 text-purple-400"
                      }`}
                    >
                      {activity.type === "buy" ? "↓" : activity.type === "sell" ? "↑" : activity.type === "earn" ? "$" : "✓"}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm">
                        {activity.action}{" "}
                        <span className="font-medium">{activity.item}</span>
                      </span>
                    </div>
                    <span className="text-xs text-muted">{activity.time}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
