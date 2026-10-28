import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Windward | Day-ahead wind intelligence",
  description:
    "Explore historical day-ahead wind forecasts and their accuracy using Elexon data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scheme-light">
      <body>{children}</body>
    </html>
  );
}
