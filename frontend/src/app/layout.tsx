import type { Metadata } from "next";
import "./globals.css";
import { AnalysisProvider } from "@/lib/analysis-store";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "CrowdPulse | AI Crowd Density Estimation & Monitoring",
  description:
    "Supervised CNN crowd density-map regression platform built with PyTorch, FastAPI, and Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-100">
        <AnalysisProvider>
          <AppShell>{children}</AppShell>
        </AnalysisProvider>
      </body>
    </html>
  );
}
