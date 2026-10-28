import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wind forecast explorer",
  description: "UK wind generation forecasts and accuracy — January 2026 pilot.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
