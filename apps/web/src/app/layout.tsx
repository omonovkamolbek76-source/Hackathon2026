import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "BusinessOS AI",
  description: "Bitta platforma. Bitta AI. Butun biznesingiz.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className={`${sans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
