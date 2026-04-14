import type { Metadata } from "next";
import ClientRootLayout from "./ClientRootLayout";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sales Co-Pilot",
    template: "%s · Sales Co-Pilot",
  },
  description: "Premium AI-native sales workspace.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
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
