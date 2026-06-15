import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AMOS — Madras MindWorks | Autonomous Marketing Operating System",
  description:
    "AMOS is the Autonomous Marketing Operating System for Madras MindWorks — an AR/VR/AI solutions company. Manage leads, outreach, social media, SEO blogs, and competitor intelligence from one AI-powered dashboard.",
  keywords: [
    "AMOS",
    "Madras MindWorks",
    "AR VR AI",
    "marketing automation",
    "lead generation",
    "autonomous marketing",
    "Chennai",
    "India",
  ],
  authors: [{ name: "Madras MindWorks" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AMOS — Autonomous Marketing Operating System",
    description:
      "AI-powered marketing operating system for Madras MindWorks AR/VR/AI solutions.",
    siteName: "Madras MindWorks",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}