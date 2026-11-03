import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StorageWarning } from "@/components/layout/StorageWarning";
import { site, siteUrl } from "@/lib/site";
import "./globals.css";

// globals.css maps Tailwind's font-sans and font-mono to these variables
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Notation, evals and clocks: data that lines up in columns
const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
});

// Link previews need absolute URLs, so metadata resolves relative ones against siteUrl
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: { title: `${site.name} | ${site.tagline}`, description: site.description, type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Dark-only: the "dark" class turns on the dark variants in the shadcn components
    <html
      lang="en"
      className={`dark ${archivo.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <StorageWarning />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
