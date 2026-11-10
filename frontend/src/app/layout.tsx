import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "zkode | Privacy-Preserving Eligibility Verification",
  description: "Client-side Zero-Knowledge Groth16 selective disclosure platform with dynamic agentic policy compiler",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen selection:bg-emerald-500/30 selection:text-emerald-200">
        <div className="fixed inset-0 bg-grid-pattern pointer-events-none z-0" />
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
