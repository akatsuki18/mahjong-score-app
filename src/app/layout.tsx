import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "麻雀スコア管理アプリ",
  description: "麻雀の対局結果を記録・管理するアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1 container mx-auto py-6 px-4">
            {children}
          </main>
          <footer className="border-t py-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} 麻雀スコア管理アプリ
          </footer>
        </div>
      </body>
    </html>
  );
}
