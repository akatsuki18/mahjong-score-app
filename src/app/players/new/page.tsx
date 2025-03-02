import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { PlayerForm } from "@/components/player-form";

export default function NewPlayerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">新規プレイヤー登録</h1>
        <Link href="/players" passHref>
          <Button variant="outline">プレイヤー一覧に戻る</Button>
        </Link>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>プレイヤー情報</CardTitle>
          <CardDescription>
            新しいプレイヤーを登録します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlayerForm />
        </CardContent>
      </Card>
    </div>
  );
}