import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-primary",
});

export const metadata: Metadata = {
  title: "zkode | Selective Disclosure and Eligibility Verification",
  description: "Client verified zero knowledge proofs for statutory eligibility without personal data exposure",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${manrope.variable}`}>
      <body className="bg-[#000000] text-[#FAFAFA] min-h-screen">
        <div className="relative flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
