import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { Metadata } from "next";
import { Montserrat, Rubik } from "next/font/google";
import Provider from "@providers/Provider";
import Header from "@components/Header";
import Loader from "@components/Loader";

export const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
  variable: "--Montserrat",
});

export const rubik = Rubik({
  weight: "400",
  subsets: ["latin"],
  variable: "--Rubik",
});

export const metadata: Metadata = {
  title: "ソラナ",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  description:
    "NFTを作成してエアドロップするには",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>    
      <body
        className={`${montserrat.variable} ${rubik.variable} font-rubik relative`}
      >
        <Provider
          attribute="data-theme"
          storageKey="sol-launchpad-theme"
        >
          <Header />
          {children}
          <Loader />
        </Provider>
      </body>
    </html>
  );
}
