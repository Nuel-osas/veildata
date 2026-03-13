import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ClientProviders from "@/components/shared/ClientProviders";
import Navbar from "@/components/shared/Navbar";

const neueMontreal = localFont({
  src: "../../../ochi.design-UI-Clone/src/assets/NeueMontreal-Regular.ttf",
  variable: "--font-neue",
  display: "swap",
});

const foundersGrotesk = localFont({
  src: "../../../ochi.design-UI-Clone/src/assets/FoundersGrotesk-Semibold.ttf",
  variable: "--font-founders",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VeilData — Confidential Data Marketplace",
  description:
    "Buy and sell data privately. Powered by Aleo zero-knowledge proofs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${neueMontreal.variable} ${foundersGrotesk.variable} antialiased noise`}
      >
        <ClientProviders>
          <Navbar />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
