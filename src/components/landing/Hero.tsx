"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 0.3 });

      tl.from(".hero-line", {
        yPercent: 120,
        opacity: 0,
        duration: 1.2,
        ease: "power4.out",
        stagger: 0.1,
      })
        .from(
          ".hero-subtitle",
          {
            yPercent: 40,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.5"
        )
        .from(
          ".hero-cta",
          {
            yPercent: 30,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out",
          },
          "-=0.4"
        )
        .from(
          ".hero-stats",
          {
            yPercent: 20,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.1,
          },
          "-=0.3"
        );

      // Parallax on scroll
      gsap.to(".hero-content", {
        yPercent: -15,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(201,255,59,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(201,255,59,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px]" />

      <div className="hero-content relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="hero-line inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-secondary/50 mb-8">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-text-secondary font-mono">
            Powered by Aleo Zero-Knowledge Proofs
          </span>
        </div>

        {/* Title */}
        <h1
          ref={titleRef}
          className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-6"
        >
          <span className="hero-line block">Data has value.</span>
          <span className="hero-line block mt-2">
            Keep it <span className="gradient-text">private.</span>
          </span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="hero-subtitle text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          The first confidential data marketplace. Sell datasets with
          zero-knowledge proofs of quality. Buy with privacy. No one sees
          what you trade.
        </p>

        {/* CTAs */}
        <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <motion.a
            href="/sell"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-8 py-4 bg-accent text-black font-semibold rounded-full text-lg hover:bg-accent-dim transition-colors"
          >
            List Your Data
          </motion.a>
          <motion.a
            href="/#marketplace"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-8 py-4 border border-border text-foreground font-medium rounded-full text-lg hover:border-border-hover hover:bg-card/50 transition-all"
          >
            Browse Marketplace
          </motion.a>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {[
            { value: "100%", label: "Private Transactions" },
            { value: "ZK", label: "Verified Data Quality" },
            { value: "$0", label: "Data Exposure Risk" },
          ].map((stat) => (
            <div key={stat.label} className="hero-stats text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent">
                {stat.value}
              </div>
              <div className="text-sm text-text-secondary mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
