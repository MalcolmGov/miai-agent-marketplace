import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { Shell } from "@/components/Shell";
import { SandboxBanner } from "@/components/SandboxBanner";
import { LocaleProvider } from "@/lib/locale";
import { LOCALE_BOOT_SCRIPT } from "@/lib/locale-boot";
import { ThemeProvider } from "@/lib/theme";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";
import "./globals.css";

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyInstantAI Agents — The global agent marketplace",
  description:
    "Rent production-ready AI agent families across US, EU, Africa, and Asia. Configure, connect Actions, embed, and run on prepaid tokens.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b12" },
    { media: "(prefers-color-scheme: light)", color: "#e6edf5" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" data-theme="dark" data-locale="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <SandboxBanner />
        <div id="app-root">
          <ThemeProvider>
            <LocaleProvider>
              <Shell>{children}</Shell>
            </LocaleProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
