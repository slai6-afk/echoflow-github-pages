import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import DemoGuard from "@/components/DemoGuard";

const titleFont = Playfair_Display({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-anta",
  display: "swap",
});

const bodyFont = Manrope({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-league",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Ethereal Echo — Voice Studio",
  description:
    "A premium editorial pronunciation studio with minimalist navigation and refined AI-guided practice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${titleFont.variable} ${bodyFont.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased bg-white">
        <DemoGuard>{children}</DemoGuard>
      </body>
    </html>
  );
}
