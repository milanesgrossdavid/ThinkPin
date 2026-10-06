import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { CommandMenu } from "../components/search/command-menu";
import { BookmarkInteractionsProvider } from "../components/bookmarks/bookmark-interactions-provider";
import { AppToaster } from "../components/feedback/AppToaster";
import { SmartSaveDialog } from "../components/bookmarks/smart-save-dialog";
import { BookmarkSync } from "../components/bookmarks/bookmark-sync";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThinkPin — Guarda tus ideas",
  description:
    "Un rincón tranquilo para guardar pensamientos, referencias y pequeños descubrimientos.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/icon-light.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full">
        <AppToaster>
          <BookmarkInteractionsProvider>
            <BookmarkSync />
            {children}
            <CommandMenu />
            <SmartSaveDialog />
          </BookmarkInteractionsProvider>
        </AppToaster>
      </body>
    </html>
  );
}
