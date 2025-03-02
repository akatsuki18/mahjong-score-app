import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navigation() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="font-bold text-xl">麻雀スコア管理</Link>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <nav className="flex items-center space-x-2">
            <Link href="/" passHref>
              <Button variant="ghost">ダッシュボード</Button>
            </Link>
            <Link href="/players" passHref>
              <Button variant="ghost">プレイヤー</Button>
            </Link>
            <Link href="/games" passHref>
              <Button variant="ghost">対局記録</Button>
            </Link>
            <Link href="/stats" passHref>
              <Button variant="ghost">統計</Button>
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}