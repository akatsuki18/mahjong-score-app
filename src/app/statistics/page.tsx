import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Player } from "@/types";

interface PlayerStats {
  player_id: string;
  player_name: string;
  games_played: number;
  average_rank: number;
  average_points: number;
  total_points: number;
  first_place_rate: number;
  fourth_place_rate: number;
  total_rank_points: number; // 順位点の合計
  total_combined_score: number; // 総合得点（合計得点 + 順位点）
}

// プレイヤーの統計情報を取得する関数
async function getPlayersStats(): Promise<PlayerStats[]> {
  // プレイヤー一覧を取得
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("*");

  if (playersError) {
    console.error("プレイヤー取得エラー:", playersError);
    return [];
  }

  if (!players || players.length === 0) {
    return [];
  }

  // 各プレイヤーの対局結果を取得して統計を計算
  const statsPromises = players.map(async (player) => {
    const { data: results, error: resultsError } = await supabase
      .from("game_results")
      .select("*")
      .eq("player_id", player.id);

    // 日別順位点を取得
    const { data: dailySummaries, error: dailySummaryError } = await supabase
      .from("daily_summary")
      .select("rank_point")
      .eq("player_id", player.id);

    // 順位点の合計を計算
    const total_rank_points = dailySummaries && dailySummaries.length > 0
      ? dailySummaries.reduce((sum, day) => sum + day.rank_point, 0)
      : 0;

    if (resultsError || !results || results.length === 0) {
      return {
        player_id: player.id,
        player_name: player.name,
        games_played: 0,
        average_rank: 0,
        average_points: 0,
        total_points: 0,
        first_place_rate: 0,
        fourth_place_rate: 0,
        total_rank_points,
        total_combined_score: 0
      };
    }

    const games_played = results.length;
    const total_points = results.reduce((sum, result) => sum + result.score, 0);
    const average_rank = results.reduce((sum, result) => sum + result.rank, 0) / games_played;
    const average_points = total_points / games_played;
    const first_place_count = results.filter(result => result.rank === 1).length;
    const fourth_place_count = results.filter(result => result.rank === 4).length;
    const first_place_rate = (first_place_count / games_played) * 100;
    const fourth_place_rate = (fourth_place_count / games_played) * 100;

    return {
      player_id: player.id,
      player_name: player.name,
      games_played,
      average_rank,
      average_points,
      total_points,
      first_place_rate,
      fourth_place_rate,
      total_rank_points,
      total_combined_score: total_points + total_rank_points
    };
  });

  const stats = await Promise.all(statsPromises);

  // 対局数が0のプレイヤーを除外
  return stats.filter(stat => stat.games_played > 0);
}

export default async function StatisticsPage() {
  const playersStats = await getPlayersStats();

  // 総合得点でソート
  const sortedByCombinedScore = [...playersStats].sort((a, b) => b.total_combined_score - a.total_combined_score);

  // トータルポイントでソート
  const sortedByTotalPoints = [...playersStats].sort((a, b) => b.total_points - a.total_points);

  // 平均順位でソート
  const sortedByAverageRank = [...playersStats].sort((a, b) => a.average_rank - b.average_rank);

  // トップ率でソート
  const sortedByFirstPlaceRate = [...playersStats].sort((a, b) => b.first_place_rate - a.first_place_rate);

  // ラス率でソート
  const sortedByFourthPlaceRate = [...playersStats].sort((a, b) => a.fourth_place_rate - b.fourth_place_rate);

  // 順位点でソート
  const sortedByRankPoints = [...playersStats].sort((a, b) => b.total_rank_points - a.total_rank_points);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">統計情報</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>総合ランキング</CardTitle>
          <CardDescription>
            全プレイヤーの総合得点（合計得点＋順位点）ランキングです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>順位</TableHead>
                <TableHead>プレイヤー</TableHead>
                <TableHead>半荘数</TableHead>
                <TableHead>平均順位</TableHead>
                <TableHead>合計得点</TableHead>
                <TableHead>順位点</TableHead>
                <TableHead>総合得点</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByCombinedScore.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                sortedByCombinedScore.map((stat, index) => (
                  <TableRow key={stat.player_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/players/${stat.player_id}`} className="hover:underline">
                        {stat.player_name}
                      </Link>
                    </TableCell>
                    <TableCell>{stat.games_played}</TableCell>
                    <TableCell>{stat.average_rank.toFixed(1)}</TableCell>
                    <TableCell>{stat.total_points.toLocaleString()}</TableCell>
                    <TableCell>{stat.total_rank_points}点</TableCell>
                    <TableCell>{stat.total_combined_score.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>合計得点ランキング</CardTitle>
          <CardDescription>
            全プレイヤーの合計得点ランキングです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>順位</TableHead>
                <TableHead>プレイヤー</TableHead>
                <TableHead>半荘数</TableHead>
                <TableHead>平均順位</TableHead>
                <TableHead>合計得点</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByTotalPoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                sortedByTotalPoints.map((stat, index) => (
                  <TableRow key={stat.player_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/players/${stat.player_id}`} className="hover:underline">
                        {stat.player_name}
                      </Link>
                    </TableCell>
                    <TableCell>{stat.games_played}</TableCell>
                    <TableCell>{stat.average_rank.toFixed(1)}</TableCell>
                    <TableCell>{stat.total_points.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>順位点ランキング</CardTitle>
          <CardDescription>
            全プレイヤーの順位点ランキングです（日別1位: 10点, 2位: 6点, 3位: 3点）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>順位</TableHead>
                <TableHead>プレイヤー</TableHead>
                <TableHead>半荘数</TableHead>
                <TableHead>平均順位</TableHead>
                <TableHead>順位点</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByRankPoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                sortedByRankPoints.map((stat, index) => (
                  <TableRow key={stat.player_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/players/${stat.player_id}`} className="hover:underline">
                        {stat.player_name}
                      </Link>
                    </TableCell>
                    <TableCell>{stat.games_played}</TableCell>
                    <TableCell>{stat.average_rank.toFixed(1)}</TableCell>
                    <TableCell>{stat.total_rank_points}点</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>平均順位ランキング</CardTitle>
          <CardDescription>
            全プレイヤーの平均順位ランキングです（5半荘以上）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>順位</TableHead>
                <TableHead>プレイヤー</TableHead>
                <TableHead>半荘数</TableHead>
                <TableHead>平均順位</TableHead>
                <TableHead>トップ率</TableHead>
                <TableHead>ラス率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByAverageRank.filter(stat => stat.games_played >= 5).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                sortedByAverageRank.filter(stat => stat.games_played >= 5).map((stat, index) => (
                  <TableRow key={stat.player_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/players/${stat.player_id}`} className="hover:underline">
                        {stat.player_name}
                      </Link>
                    </TableCell>
                    <TableCell>{stat.games_played}</TableCell>
                    <TableCell>{stat.average_rank.toFixed(2)}</TableCell>
                    <TableCell>{stat.first_place_rate.toFixed(1)}%</TableCell>
                    <TableCell>{stat.fourth_place_rate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>トップ率ランキング</CardTitle>
          <CardDescription>
            全プレイヤーのトップ率ランキングです（5半荘以上）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>順位</TableHead>
                <TableHead>プレイヤー</TableHead>
                <TableHead>半荘数</TableHead>
                <TableHead>トップ率</TableHead>
                <TableHead>平均順位</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByFirstPlaceRate.filter(stat => stat.games_played >= 5).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                sortedByFirstPlaceRate.filter(stat => stat.games_played >= 5).map((stat, index) => (
                  <TableRow key={stat.player_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/players/${stat.player_id}`} className="hover:underline">
                        {stat.player_name}
                      </Link>
                    </TableCell>
                    <TableCell>{stat.games_played}</TableCell>
                    <TableCell>{stat.first_place_rate.toFixed(1)}%</TableCell>
                    <TableCell>{stat.average_rank.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ラス回避率ランキング</CardTitle>
          <CardDescription>
            全プレイヤーのラス回避率ランキングです（5半荘以上）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>順位</TableHead>
                <TableHead>プレイヤー</TableHead>
                <TableHead>半荘数</TableHead>
                <TableHead>ラス率</TableHead>
                <TableHead>平均順位</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByFourthPlaceRate.filter(stat => stat.games_played >= 5).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                sortedByFourthPlaceRate.filter(stat => stat.games_played >= 5).map((stat, index) => (
                  <TableRow key={stat.player_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/players/${stat.player_id}`} className="hover:underline">
                        {stat.player_name}
                      </Link>
                    </TableCell>
                    <TableCell>{stat.games_played}</TableCell>
                    <TableCell>{stat.fourth_place_rate.toFixed(1)}%</TableCell>
                    <TableCell>{stat.average_rank.toFixed(2)}</TableCell>
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