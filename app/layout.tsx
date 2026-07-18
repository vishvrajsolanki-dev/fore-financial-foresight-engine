import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
