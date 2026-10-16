import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Watchlist — Your next great watch",
  description:
    "Keep your movie recommendations in one place. Save films, track what you have watched, and plan your next movie night.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only"
        >
          Skip to content
        </a>
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <Link
              href="/"
              aria-label="Watchlist home"
              className="flex min-h-11 items-center gap-2.5 rounded-md text-lg font-semibold tracking-tight"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Clapperboard size={19} aria-hidden="true" />
              </span>
              <span>
                watchlist<span className="text-primary">.</span>
              </span>
            </Link>
            <span className="text-right text-xs font-medium tracking-widest text-muted-foreground">
              FOR THE LOVE OF FILM
            </span>
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14"
        >
          <QueryProvider>{children}</QueryProvider>
        </main>
        <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t px-5 py-6 text-xs text-muted-foreground sm:px-8">
          <span>Good films. All in one place.</span>
          <span>Save it. Watch it. Remember it.</span>
        </footer>
        <Toaster />
      </body>
    </html>
  );
};

export default RootLayout;
