import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Aura Chat - Admin Workspace",
  description: "Next-generation multi-tenant AI chatbot platform with human handoff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="flex h-screen overflow-hidden text-slate-50">
        {children}
      </body>
    </html>
  );
}
