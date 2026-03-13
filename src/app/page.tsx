import Hero from "@/components/landing/Hero";
import SignalMarquee from "@/components/landing/SignalMarquee";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import MarketplaceGrid from "@/components/marketplace/MarketplaceGrid";
import Footer from "@/components/shared/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <SignalMarquee />
      <HowItWorks />
      <Features />
      <MarketplaceGrid />
      <Footer />
    </main>
  );
}
