import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { Shell } from "@/components/Shell";
import { ThemeProvider } from "@/lib/theme";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";
import "./globals.css";

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <div id="app-root">
          <ThemeProvider>
            <Shell>{children}</Shell>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
