'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="border-b">
      <div className="container mx-auto px-4">
        {/* モバイル向けヘッダー */}
        <div className="md:hidden">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="font-bold text-xl">ブラックあかつき</Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="メニューを開く"
            >
              <Menu size={24} />
            </button>
          </div>
          {isMenuOpen && (
            <div className="py-2 pb-4">
              <nav className="flex flex-col space-y-1">
                <Link href="/" passHref>
                  <Button variant="ghost" className="justify-start w-full" onClick={() => setIsMenuOpen(false)}>
                    ダッシュボード
                  </Button>
                </Link>
                <Link href="/players" passHref>
                  <Button variant="ghost" className="justify-start w-full" onClick={() => setIsMenuOpen(false)}>
                    プレイヤー
                  </Button>
                </Link>
                <Link href="/games" passHref>
                  <Button variant="ghost" className="justify-start w-full" onClick={() => setIsMenuOpen(false)}>
                    対局記録
                  </Button>
                </Link>
                <Link href="/statistics" passHref>
                  <Button variant="ghost" className="justify-start w-full" onClick={() => setIsMenuOpen(false)}>
                    統計
                  </Button>
                </Link>
              </nav>
            </div>
          )}
        </div>

        {/* デスクトップ向けヘッダー */}
        <div className="hidden md:flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="font-bold text-xl mr-8">ブラックあかつき</Link>
            <nav className="flex space-x-1">
              <Link href="/" passHref>
                <Button variant="ghost">ダッシュボード</Button>
              </Link>
              <Link href="/players" passHref>
                <Button variant="ghost">プレイヤー</Button>
              </Link>
              <Link href="/games" passHref>
                <Button variant="ghost">対局記録</Button>
              </Link>
              <Link href="/statistics" passHref>
                <Button variant="ghost">統計</Button>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}