import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PhishBlock - Real-time Phishing URL Detection",
  description: "Protect yourself from phishing attacks with ML-powered real-time detection. PhishBlock uses advanced XGBoost machine learning to analyze URLs and block threats instantly.",
  keywords: ["phishing", "security", "browser extension", "URL detection", "cybersecurity", "machine learning", "protection"],
  authors: [{ name: "PhishBlock Team" }],
  openGraph: {
    title: "PhishBlock - Real-time Phishing URL Detection",
    description: "Protect yourself from phishing attacks with ML-powered real-time detection.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PhishBlock - Real-time Phishing URL Detection",
    description: "Protect yourself from phishing attacks with ML-powered real-time detection.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
