import type { Metadata } from "next";
import { Lexend, Manrope } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { FinancialContextProvider } from "@/lib/context/FinancialContextProvider";
import AppearanceBoot from "@/components/shell/AppearanceBoot";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FORE — Financial Foresight Engine",
  description: "See your financial future clearly. Past, Decide, Ahead.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${lexend.variable}`} data-appearance="light">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <PwaRegister />
        <AppearanceBoot />
        <FinancialContextProvider>{children}</FinancialContextProvider>
      </body>
    </html>
  );
}
