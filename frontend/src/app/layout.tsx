import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "zkode | Zero Knowledge Selective Disclosure",
  description: "Statutory compliance verified locally in browser WebAssembly using zero knowledge proofs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="bg-nothing-dots text-[#FAFAFA] min-h-screen antialiased selection:bg-white selection:text-black">
        <SmoothScroll>
          <div className="relative flex flex-col min-h-screen">
            {children}
          </div>
        </SmoothScroll>
      </body>
    </html>
  );
}
