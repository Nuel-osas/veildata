"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export interface ListingData {
  id: string;
  title: string;
  description: string;
  category: string;
  rowCount: number;
  price: number;
  seller: string;
  schemaPreview: string[];
  salesCount: number;
}

const categoryColors: Record<string, string> = {
  finance: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  healthcare: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  social: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  geospatial: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  analytics: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  ai: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  default: "bg-accent/10 text-accent border-accent/20",
};

export default function ListingCard({ listing }: { listing: ListingData }) {
  const colorClass =
    categoryColors[listing.category.toLowerCase()] || categoryColors.default;

  return (
    <Link href={`/listing/${listing.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
        className="group glass-card rounded-2xl p-6 hover:border-border-hover transition-all duration-300 cursor-pointer h-full flex flex-col"
      >
        {/* Category + Price */}
        <div className="flex items-start justify-between mb-4">
          <span
            className={`text-xs font-mono px-2.5 py-1 rounded-full border ${colorClass}`}
          >
            {listing.category}
          </span>
          <div className="text-right">
            <span className="text-xl font-bold text-accent">
              {listing.price}
            </span>
            <span className="text-xs text-muted ml-1">ALEO</span>
          </div>
        </div>

        {/* Title + Description */}
        <h3 className="text-lg font-semibold group-hover:text-accent transition-colors duration-300 mb-2">
          {listing.title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-1">
          {listing.description}
        </p>

        {/* Schema preview */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {listing.schemaPreview.slice(0, 4).map((col) => (
            <span
              key={col}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary border border-border text-muted"
            >
              {col}
            </span>
          ))}
          {listing.schemaPreview.length > 4 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary border border-border text-muted">
              +{listing.schemaPreview.length - 4} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-[8px] text-accent font-bold">
                {listing.seller.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-muted font-mono">
              {listing.seller.slice(0, 8)}...{listing.seller.slice(-4)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>{listing.rowCount.toLocaleString()} rows</span>
            <span>{listing.salesCount} sales</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
