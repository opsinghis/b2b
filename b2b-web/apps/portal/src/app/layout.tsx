import { AuthProvider } from "@b2b/auth/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Header } from "@/components/layout";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "B2B Customer Portal",
  description: "Customer and partner portal for B2B operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
