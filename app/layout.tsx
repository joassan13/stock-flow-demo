import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockFlow",
  description: "Multi-branch inventory management",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/branches", label: "Branches" },
  { href: "/movements", label: "Movements" },
  { href: "/reports", label: "Reports" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50">
        <nav className="bg-white border-b border-zinc-200">
          <div className="max-w-5xl mx-auto px-8 flex items-center gap-6 h-12">
            <span className="font-semibold text-zinc-900 text-sm">StockFlow</span>
            <div className="flex gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

