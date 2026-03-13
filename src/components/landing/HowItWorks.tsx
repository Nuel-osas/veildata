"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    num: "01",
    title: "Encrypt & Upload",
    desc: "Your data is encrypted client-side with AES-256. Only the encrypted blob is stored on Walrus. No one — not even us — can read it.",
    icon: "🔐",
  },
  {
    num: "02",
    title: "List on Marketplace",
    desc: "Create a private listing on Aleo with ZK proofs of your data's properties — row count, schema, quality — without revealing the data itself.",
    icon: "📋",
  },
  {
    num: "03",
    title: "Buyer Pays into Escrow",
    desc: "Buyers pay with ALEO credits into a private escrow smart contract. Transaction amounts and parties stay hidden from everyone else.",
    icon: "🔒",
  },
  {
    num: "04",
    title: "Private Delivery",
    desc: "The decryption key is delivered through a private Aleo record — only the buyer can access it. They decrypt locally. Done.",
    icon: "✉️",
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".step-card", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          end: "bottom 80%",
          toggleActions: "play none none reverse",
        },
      });

      // Animate the connecting line
      gsap.from(".step-line", {
        scaleY: 0,
        transformOrigin: "top",
        duration: 1.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 60%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="py-32 px-6 relative">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-20">
          <span className="text-xs font-mono text-accent uppercase tracking-widest">
            How it works
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mt-4">
            Privacy by default.
          </h2>
          <p className="text-text-secondary mt-4 text-lg max-w-xl mx-auto">
            Four steps. Zero data exposure.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Vertical line */}
          <div className="step-line absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border hidden md:block" />

          <div className="space-y-12 md:space-y-24">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={`step-card flex flex-col md:flex-row items-start gap-6 md:gap-12 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Content */}
                <div
                  className={`flex-1 ${
                    i % 2 === 1 ? "md:text-right" : ""
                  }`}
                >
                  <span className="text-5xl mb-4 block">{step.icon}</span>
                  <span className="text-xs font-mono text-accent">
                    {step.num}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-semibold mt-2">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary mt-3 leading-relaxed max-w-md">
                    {step.desc}
                  </p>
                </div>

                {/* Center dot */}
                <div className="hidden md:flex items-center justify-center w-4 h-4 rounded-full bg-accent shrink-0 relative z-10 mt-12" />

                {/* Spacer for alternating layout */}
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
