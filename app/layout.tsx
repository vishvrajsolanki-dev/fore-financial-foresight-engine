import type { Metadata } from "next";
import "./globals.css";
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
    <html lang="en" data-theme="light">
      <body>
        <FinancialContextProvider>{children}</FinancialContextProvider>
      </body>
    </html>
  );
}
