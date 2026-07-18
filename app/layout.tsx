import type { Metadata } from "next";
import "./globals.css";
import ThemeGuard from "@/components/ThemeGuard";
import { FinancialContextProvider } from "@/lib/context/FinancialContextProvider";

export const metadata: Metadata = {
  title: "FORE — Financial Foresight Engine",
  description:
    "PAST, DECIDE, AHEAD — one financial context, three linked views.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeGuard />
        <FinancialContextProvider>{children}</FinancialContextProvider>
      </body>
    </html>
  );
}
