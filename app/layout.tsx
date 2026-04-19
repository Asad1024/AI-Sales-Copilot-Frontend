import type { Metadata } from "next";
import ClientRootLayout from "./ClientRootLayout";
import "../styles/globals.css";
import { APP_BRAND_BROWSER_TITLE, APP_BRAND_META_DESCRIPTION } from "@/lib/brand";

export const metadata: Metadata = {
  title: APP_BRAND_BROWSER_TITLE,
  description: APP_BRAND_META_DESCRIPTION,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "var(--color-background)",
          color: "var(--color-text)",
          overflowX: "hidden",
        }}
      >
        <ClientRootLayout>{children}</ClientRootLayout>
      </body>
    </html>
  );
}
