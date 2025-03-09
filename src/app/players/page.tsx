import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Player } from "@/types";

interface PlayerStats {
  games_played: number;  // 半荘の合計数
  average_rank: number;
  average_points: number;
  total_points: number;
  total_rank_points: number; // 合計順位点
}

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

// プレイヤーの統計情報を取得する関数
async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  const { data, error } = await supabase
    .from("game_results")
    .select("rank, point, score")
    .eq("player_id", playerId);

  if (error) {
    console.error("プレイヤー統計取得エラー:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const games_played = data.length;
  const total_points = data.reduce((sum, result) => sum + result.score, 0);
  const average_rank = data.reduce((sum, result) => sum + result.rank, 0) / games_played;
  const average_points = total_points / games_played;

  // 日別集計から順位点を取得
  const { data: dailySummaries, error: summaryError } = await supabase
    .from("daily_summary")
    .select("rank_point")
    .eq("player_id", playerId);

  let total_rank_points = 0;
  if (!summaryError && dailySummaries && dailySummaries.length > 0) {
    total_rank_points = dailySummaries.reduce((sum, day) => sum + day.rank_point, 0);
  }

  return {
    games_played,
    average_rank,
    average_points,
    total_points,
    total_rank_points
  };
}

export default async function PlayersPage() {
  const players = await getPlayers();
  const playerStats = await Promise.all(
    players.map(player => getPlayerStats(player.id))
  );

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
                <TableHead>半荘数</TableHead>
                <TableHead>平均順位</TableHead>
                <TableHead>平均得点</TableHead>
                <TableHead>合計得点</TableHead>
                <TableHead>合計順位点</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    プレイヤーが登録されていません
                  </TableCell>
                </TableRow>
              ) : (
                players.map((player, index) => {
                  const stats = playerStats[index];
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{stats?.games_played || 0}</TableCell>
                      <TableCell>{stats?.average_rank?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{stats?.average_points?.toLocaleString() || 0}</TableCell>
                      <TableCell>{stats?.total_points?.toLocaleString() || 0}</TableCell>
                      <TableCell>{stats?.total_rank_points || 0}点</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/players/${player.id}`} passHref>
                          <Button variant="ghost" size="sm">詳細</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}