import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Full-stack starter",
  description: "Next.js and FastAPI starter application.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scheme-light">
      <body className="bg-stone-50 font-sans text-emerald-950 antialiased">
        {children}
      </body>
    </html>
  );
}
