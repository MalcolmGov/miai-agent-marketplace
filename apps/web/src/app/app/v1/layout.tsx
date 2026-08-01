import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Assistant",
  description: "In-app AI assistant",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Assistant",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0d1420",
};

export default function AppChannelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
