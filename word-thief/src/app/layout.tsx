import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import "../globals.css";

const readex_pro = Readex_Pro({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Word Thief",
  description: "Play with your friends!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={readex_pro.className}>{children}</body>
    </html>
  );
}
