import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dahptd",
  description:
    "Explore historical day-ahead wind forecasts and their accuracy using Elexon data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scheme-dark">
      <body>{children}</body>
    </html>
  );
}
