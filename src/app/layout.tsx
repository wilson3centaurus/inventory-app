import type { Metadata } from "next";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { DEFAULT_APP_NAME } from "@/lib/app-settings";
import "./globals.css";

export const metadata: Metadata = {
  title: DEFAULT_APP_NAME,
  description:
    "Mobile-first inventory PWA for Zimbabwean SMEs with offline-first workflows and self-hosted Supabase.",
  manifest: "/manifest.webmanifest",
  applicationName: DEFAULT_APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: DEFAULT_APP_NAME,
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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem('stockflow-theme');var theme=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;}catch(e){document.documentElement.dataset.theme='light';}})();`,
          }}
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <WorkspaceProvider>
          <ServiceWorkerRegister />
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  );
}
