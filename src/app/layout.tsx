import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReRack — a wardrobe in better circulation",
  description: "A considered digital closet and clothing marketplace.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/rerack-mark.png", apple: "/rerack-install-192.png" },
  appleWebApp: { capable: true, title: "ReRack", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#FBF9F5" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
