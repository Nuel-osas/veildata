"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ListingCard, { ListingData } from "./ListingCard";
import { fetchListings } from "@/lib/listings";
import Link from "next/link";

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

export default function MarketplaceGrid() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchListings(activeCategory).then((data) => {
      const mapped: ListingData[] = data.map((l) => ({
        id: l.listingId,
        title: l.title,
        description: l.description,
        category: l.category,
        rowCount: l.rowCount,
        price: l.price,
        seller: l.seller,
        schemaPreview: l.schemaFields.split(",").map((s) => s.trim()).filter(Boolean),
        salesCount: 0,
      }));
      setListings(mapped);
      setLoading(false);
    });
  }, [activeCategory]);

  useGSAP(
    () => {
      if (listings.length === 0) return;
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
    { scope: sectionRef, dependencies: [listings] }
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
              All transactions are private. Sellers verified on-chain.
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
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="listing-card">
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔒</div>
            <p className="text-lg font-medium mb-2">No datasets listed yet</p>
            <p className="text-sm text-muted mb-6">
              Be the first to list your data on the confidential marketplace.
            </p>
            <Link
              href="/sell"
              className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-full hover:bg-accent-dim transition-colors"
            >
              List Your Data
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
