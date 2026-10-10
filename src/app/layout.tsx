import type { Metadata } from "next";
import Script from "next/script";
import { Geist_Mono } from "next/font/google";
import { CommandMenu } from "../components/search/command-menu";
import { BookmarkInteractionsProvider } from "../components/bookmarks/bookmark-interactions-provider";
import { AppToaster } from "../components/feedback/AppToaster";
import { SmartSaveDialog } from "../components/bookmarks/smart-save-dialog";
import { BookmarkSync } from "../components/bookmarks/bookmark-sync";
import { AuthSessionSync } from "../components/auth-session-sync";
import { PrivacyAnalyticsConsent } from "../components/privacy-analytics-consent";
import { BackToTop } from "../components/back-to-top";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThinkPin — Save and organize your links",
  description:
    "Save useful links, organize them with tags and collections, and find them again with search. Optional AI tools are available on supported plans.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/icon-light.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Script
          id="thinkpin-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem("thinkpin-theme");var theme=saved==="dark"||saved==="light"?saved:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.classList.toggle("dark",theme==="dark")}catch(error){console.error("Could not restore the theme preference.",error)}})()`,
          }}
        />
        <AppToaster>
          <BookmarkInteractionsProvider>
            <AuthSessionSync />
            <PrivacyAnalyticsConsent />
            <BookmarkSync />
            {children}
            <CommandMenu />
            <SmartSaveDialog />
            <BackToTop />
          </BookmarkInteractionsProvider>
        </AppToaster>
      </body>
    </html>
  );
}
