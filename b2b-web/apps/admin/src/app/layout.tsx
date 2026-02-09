import { AuthProvider } from "@b2b/auth/react";
import { ToastProvider } from "@b2b/ui";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Sidebar } from "@/components/layout";
import { QueryProvider } from "@/lib/query-client";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "B2B Admin Portal",
  description: "Internal administration portal for B2B operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <div className="flex h-screen">
                <Sidebar />
                <main className="flex-1 overflow-auto">{children}</main>
              </div>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
