import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlmostCrackd — Caption Rater",
  description: "Rate AI-generated captions on hilarious images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
