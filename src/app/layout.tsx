import type { Metadata } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "SokoFlow",
  description:
    "Mobile-first inventory PWA for Zimbabwean SMEs with offline-first workflows and self-hosted Supabase.",
  manifest: "/manifest.webmanifest",
  applicationName: "SokoFlow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SokoFlow",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
