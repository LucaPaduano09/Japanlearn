import type { Metadata, Viewport } from "next";
import { Klee_One, Noto_Sans_JP } from "next/font/google";
import { TabBar } from "@/components/ui/TabBar";
import { strings } from "@/lib/strings";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

// Handwriting-style font for model characters.
const kleeOne = Klee_One({
  variable: "--font-klee-one",
  weight: ["400", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: strings.appName,
  description: "Learn Japanese by writing it by hand.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets env(safe-area-inset-*) report real values
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${notoSansJp.variable} ${kleeOne.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <main className="flex flex-1 flex-col pt-safe pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  );
}
