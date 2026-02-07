import { AuthProvider } from "@b2b/auth/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Login - B2B Admin Portal",
  description: "Sign in to B2B Admin Portal",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
