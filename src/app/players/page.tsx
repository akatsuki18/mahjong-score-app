import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Player } from "@/types";

// プレイヤー一覧を取得する関数
async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name");

  if (error) {
    console.error("プレイヤー取得エラー:", error);
    return [];
  }

  return data || [];
}

export default async function PlayersPage() {
  const players = await getPlayers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">プレイヤー一覧</h1>
        <Link href="/players/new" passHref>
          <Button>新規プレイヤー登録</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>登録プレイヤー</CardTitle>
          <CardDescription>
            システムに登録されているプレイヤーの一覧です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>対局数</TableHead>
                <TableHead>平均順位</TableHead>
                <TableHead>平均得点</TableHead>
                <TableHead>トータルポイント</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    プレイヤーが登録されていません
                  </TableCell>
                </TableRow>
              ) : (
                players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/players/${player.id}`} passHref>
                        <Button variant="ghost" size="sm">詳細</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}