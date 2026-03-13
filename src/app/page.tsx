import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import MarketplaceGrid from "@/components/marketplace/MarketplaceGrid";
import Footer from "@/components/shared/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Features />
      <MarketplaceGrid />
      <Footer />
    </main>
  );
}
