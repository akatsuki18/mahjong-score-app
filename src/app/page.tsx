'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { PlayerScoreChart } from "@/components/PlayerScoreChart";

// ダッシュボードのデータ型
interface DashboardData {
  totalGames: number;
  monthlyGames: number;
  totalPlayers: number;
  averageScore: number;
  highestScore: {
    score: number;
    playerName: string;
    date: string;
  } | null;
  topPlayers: {
    id: string;
    name: string;
    total_points: number;
    games_played: number;
  }[];
}

export default function Home() {
  const [data, setData] = useState<DashboardData>({
    totalGames: 0,
    monthlyGames: 0,
    totalPlayers: 0,
    averageScore: 0,
    highestScore: null,
    topPlayers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // 総対局数を取得
        const { count: totalGames } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true });

        // 今月の対局数を取得
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { count: monthlyGames } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .gte('date', firstDayOfMonth);

        // 登録プレイヤー数を取得
        const { count: totalPlayers } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true });

        // 平均得点を取得
        const { data: scoreData } = await supabase
          .from('game_results')
          .select('score');

        const averageScore = scoreData && scoreData.length > 0
          ? Math.round(scoreData.reduce((sum, item) => sum + item.score, 0) / scoreData.length)
          : 0;

        // 最高得点を取得
        const { data: highScoreData } = await supabase
          .from('game_results')
          .select(`
            score,
            player_id,
            game_id
          `)
          .order('score', { ascending: false })
          .limit(1)
          .single();

        let highestScore = null;

        if (highScoreData) {
          // プレイヤー情報を取得
          const { data: playerData } = await supabase
            .from('players')
            .select('name')
            .eq('id', highScoreData.player_id)
            .single();

          // 対局情報を取得
          const { data: gameData } = await supabase
            .from('games')
            .select('date')
            .eq('id', highScoreData.game_id)
            .single();

          highestScore = {
            score: highScoreData.score,
            playerName: playerData?.name || '不明',
            date: gameData?.date || ''
          };
        }

        // 全プレイヤーの得点合計を取得
        const { data: allPlayersData } = await supabase
          .from('players')
          .select('id, name');

        let playerTotals: {
          id: string;
          name: string;
          total_points: number;
          games_played: number;
        }[] = [];

        if (allPlayersData && allPlayersData.length > 0) {
          // 各プレイヤーの対局結果を取得
          const playerPromises = allPlayersData.map(async (player) => {
            const { data: resultsData } = await supabase
              .from('game_results')
              .select('score')
              .eq('player_id', player.id);

            const total_points = resultsData && resultsData.length > 0
              ? resultsData.reduce((sum, item) => sum + item.score, 0)
              : 0;
            const games_played = resultsData ? resultsData.length : 0;

            return {
              id: player.id,
              name: player.name,
              total_points,
              games_played
            };
          });

          playerTotals = await Promise.all(playerPromises);
          // 合計得点でソート
          playerTotals.sort((a, b) => b.total_points - a.total_points);
        }

        // 今月の成績トッププレイヤーを取得
        const { data: topPlayersData } = await supabase
          .from('player_stats')
          .select(`
            player_id,
            total_points,
            games_played,
            players(id, name)
          `)
          .order('total_points', { ascending: false })
          .limit(5);

        const topPlayers = topPlayersData
          ? topPlayersData.map(item => ({
              id: item.players[0]?.id || '',
              name: item.players[0]?.name || '不明',
              total_points: item.total_points,
              games_played: item.games_played
            }))
          : [];

        setData({
          totalGames: totalGames || 0,
          monthlyGames: monthlyGames || 0,
          totalPlayers: totalPlayers || 0,
          averageScore,
          highestScore,
          topPlayers: playerTotals.length > 0 ? playerTotals.slice(0, 5) : topPlayers
        });
      } catch (error) {
        console.error('ダッシュボードデータの取得エラー:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy年MM月dd日", { locale: ja });
    } catch (_) {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Link href="/games/new" passHref>
            <Button>新規対局登録</Button>
          </Link>
          <Link href="/players/new" passHref>
            <Button variant="outline">プレイヤー登録</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総対局数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalGames}</div>
                <p className="text-xs text-muted-foreground">
                  今月: {data.monthlyGames}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">登録プレイヤー</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalPlayers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均得点</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.averageScore.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  全プレイヤー平均
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">最高得点</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.highestScore ? data.highestScore.score.toLocaleString() : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.highestScore
                    ? `${data.highestScore.playerName} (${formatDate(data.highestScore.date)})`
                    : '記録なし'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="w-full overflow-hidden">
              <CardHeader>
                <CardTitle>プレイヤー別合計得点</CardTitle>
                <CardDescription>全対局の合計得点</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] w-full">
                <PlayerScoreChart
                  gameResults={data.topPlayers.length > 0 ? data.topPlayers.map(player => ({
                    id: player.id,
                    name: player.name,
                    score: player.total_points,
                    rank: 0 // ランクは表示用の色分けに使用
                  })) : [
                    { id: "dummy1", name: "プレイヤー1", score: 25000, rank: 0 },
                    { id: "dummy2", name: "プレイヤー2", score: 20000, rank: 0 },
                    { id: "dummy3", name: "プレイヤー3", score: 15000, rank: 0 },
                    { id: "dummy4", name: "プレイヤー4", score: 10000, rank: 0 }
                  ]}
                />
              </CardContent>
            </Card>

            <Card className="w-full overflow-x-auto">
              <CardHeader>
                <CardTitle>成績トップ</CardTitle>
                <CardDescription>
                  成績上位プレイヤー
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.topPlayers.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>プレイヤー</TableHead>
                          <TableHead className="text-right">対局数</TableHead>
                          <TableHead className="text-right">合計ポイント</TableHead>
                          <TableHead className="text-right">平均ポイント</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topPlayers.map((player) => (
                          <TableRow key={player.id}>
                            <TableCell className="font-medium">
                              <Link href={`/players/${player.id}`} className="hover:underline">
                                {player.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">{player.games_played}</TableCell>
                            <TableCell className="text-right">{player.total_points}</TableCell>
                            <TableCell className="text-right">
                              {player.games_played > 0
                                ? (player.total_points / player.games_played).toFixed(1)
                                : '0.0'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">データがありません</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
