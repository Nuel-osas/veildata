"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ListingCard, { ListingData } from "./ListingCard";

gsap.registerPlugin(ScrollTrigger);

const categories = [
  "All",
  "Finance",
  "Healthcare",
  "Social",
  "Analytics",
  "AI",
  "Geospatial",
];

// Mock data for demo
const mockListings: ListingData[] = [
  {
    id: "1",
    title: "DeFi Trading Patterns Q1 2026",
    description:
      "Aggregated trading patterns across major DEXs. Includes volume, frequency, and pair analysis. No wallet addresses exposed.",
    category: "Finance",
    rowCount: 50000,
    price: 25,
    seller: "aleo1qr2h4s8xgn7k3m9p0v5w8y1z6a4b7c0d3e6f9",
    schemaPreview: ["pair", "volume_24h", "trade_count", "avg_size", "spread"],
    salesCount: 12,
  },
  {
    id: "2",
    title: "Anonymous Health Survey — Sleep Patterns",
    description:
      "10K participant sleep study data. Fully anonymized. Verified by ZK proof of institutional origin.",
    category: "Healthcare",
    rowCount: 10000,
    price: 40,
    seller: "aleo1m5n8k2j4h6g9f1d3s7a0p2o5i8u1y4t7r0e3w",
    schemaPreview: [
      "age_range",
      "sleep_hours",
      "quality_score",
      "rem_pct",
      "device_type",
    ],
    salesCount: 8,
  },
  {
    id: "3",
    title: "Social Engagement Metrics — Creator Economy",
    description:
      "Engagement rates, growth trends, and content performance metrics from 5K+ verified creators.",
    category: "Social",
    rowCount: 25000,
    price: 15,
    seller: "aleo1x9c2v4b6n8m0k3j5h7g1f4d6s8a0p2o5i9u3y",
    schemaPreview: [
      "platform",
      "followers",
      "engagement_rate",
      "content_type",
      "growth_30d",
    ],
    salesCount: 23,
  },
  {
    id: "4",
    title: "ML Training Set — Sentiment Analysis",
    description:
      "Labeled sentiment dataset for NLP model training. 100K+ entries with multi-language support.",
    category: "AI",
    rowCount: 100000,
    price: 60,
    seller: "aleo1w3e5r7t9y1u3i5o7p9a2s4d6f8g0h2j4k6l8z",
    schemaPreview: [
      "text_hash",
      "sentiment",
      "confidence",
      "language",
      "source_type",
    ],
    salesCount: 5,
  },
  {
    id: "5",
    title: "Urban Mobility Heatmaps — Q4 2025",
    description:
      "Aggregated movement patterns in 20 major cities. Privacy-preserving — no individual tracking.",
    category: "Geospatial",
    rowCount: 75000,
    price: 35,
    seller: "aleo1a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s",
    schemaPreview: ["city", "zone", "hour", "density_score", "transport_mode"],
    salesCount: 17,
  },
  {
    id: "6",
    title: "DeFi Yield History — Top 50 Protocols",
    description:
      "Historical APY/APR data across lending, staking, and LP positions. Daily granularity.",
    category: "Finance",
    rowCount: 30000,
    price: 20,
    seller: "aleo1z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h",
    schemaPreview: ["protocol", "pool", "apy", "tvl", "date", "chain"],
    salesCount: 31,
  },
];

export default function MarketplaceGrid() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredListings =
    activeCategory === "All"
      ? mockListings
      : mockListings.filter((l) => l.category === activeCategory);

  useGSAP(
    () => {
      gsap.from(".listing-card", {
        y: 40,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: sectionRef, dependencies: [activeCategory] }
  );

  return (
    <section id="marketplace" ref={sectionRef} className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="text-xs font-mono text-accent uppercase tracking-widest">
              Marketplace
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3">
              Browse datasets
            </h2>
            <p className="text-text-secondary mt-2">
              All transactions are private. Sellers verified by ZK proofs.
            </p>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs font-mono rounded-full border transition-all duration-300 ${
                  activeCategory === cat
                    ? "bg-accent text-black border-accent"
                    : "border-border text-muted hover:border-border-hover hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div key={listing.id} className="listing-card">
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-20 text-muted">
            <p className="text-lg">No datasets in this category yet.</p>
            <p className="text-sm mt-2">Be the first to list one.</p>
          </div>
        )}
      </div>
    </section>
  );
}
