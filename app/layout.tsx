import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Field Tracker",
  description: "Field sales system",
  manifest: "/api/manifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The company's brand colour, resolved server-side into the full accent
            ramp. Loaded as a stylesheet so it paints on the first frame instead
            of flashing the default blue first. */}
        <link rel="stylesheet" href="/api/theme.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
