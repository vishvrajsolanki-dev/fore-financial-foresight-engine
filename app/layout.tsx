import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { FinancialContextProvider } from "@/lib/context/FinancialContextProvider";

export const metadata: Metadata = {
  title: "FORE — Financial Foresight Engine",
  description:
    "PAST, DECIDE, AHEAD — one financial context, three linked views.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        <FinancialContextProvider>{children}</FinancialContextProvider>
      </body>
    </html>
  );
}
