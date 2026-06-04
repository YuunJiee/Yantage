import type { Metadata, Viewport } from "next";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yantage",
  description: "Advanced Asset Intelligence",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yantage",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { ClientLayout } from "@/components/ClientLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${lora.variable} antialiased`}
        data-chart-theme="Morandi"
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
