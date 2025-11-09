import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arela - Engineering Discipline as Code",
  description: "Bootstrap CTO-level rules, CI guardrails, and evaluation baselines in 60 seconds",
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
