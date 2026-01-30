import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter for premium look
import "./globals.css";
import Header from "@/components/layout/Header";
import { Toaster } from "@/components/ui/toaster";

import { AppProvider } from "@/context/AppContext";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "Leave Management System",
  description: "Efficient leave request and approval system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AppProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 bg-muted/40 pb-10">
              {children}
            </main>
          </div>
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
