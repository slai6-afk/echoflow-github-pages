import type { Metadata } from "next";
import { Anta, League_Spartan } from "next/font/google";
import "./globals.css";

const anta = Anta({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anta",
  display: "swap",
});

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  variable: "--font-league",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EchoFlow AI — Speak with Precision",
  description:
    "A premium AI pronunciation coach that gives you the linguistic insight of a world-class expert.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${anta.variable} ${leagueSpartan.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
