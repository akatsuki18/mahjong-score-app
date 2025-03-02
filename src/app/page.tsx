'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  recentGames: {
    id: string;
    date: string;
    venue: string | null;
    players: {
      id: string;
      name: string;
      score: number;
      rank: number;
    }[];
  }[];
}

export default function Home() {
  const [data, setData] = useState<DashboardData>({
    totalGames: 0,
    monthlyGames: 0,
    totalPlayers: 0,
    averageScore: 0,
    highestScore: null,
    topPlayers: [],
    recentGames: []
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

        // 最近の対局を取得
        const { data: recentGamesData } = await supabase
          .from('games')
          .select(`
            id,
            date,
            venue,
            results:game_results(
              player_id,
              score,
              rank,
              player:players(id, name)
            )
          `)
          .order('date', { ascending: false })
          .limit(5);

        const recentGames = recentGamesData
          ? recentGamesData.map(game => ({
              id: game.id,
              date: game.date,
              venue: game.venue,
              players: game.results.map((result: any) => ({
                id: result.player.id,
                name: result.player.name,
                score: result.score,
                rank: result.rank
              }))
            }))
          : [];

        setData({
          totalGames: totalGames || 0,
          monthlyGames: monthlyGames || 0,
          totalPlayers: totalPlayers || 0,
          averageScore,
          highestScore,
          topPlayers: playerTotals.length > 0 ? playerTotals.slice(0, 5) : topPlayers,
          recentGames
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
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="recent">最近の対局</TabsTrigger>
            <TabsTrigger value="stats">統計</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>成績トップ</CardTitle>
                  <CardDescription>
                    成績上位プレイヤー
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.topPlayers.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-muted-foreground">データがありません</p>
                  )}
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle>プレイヤー別合計得点</CardTitle>
                  <CardDescription>全対局の合計得点</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
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
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>最近の対局</CardTitle>
                <CardDescription>
                  最近行われた対局の結果
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentGames.length > 0 ? (
                  <div className="space-y-6">
                    {data.recentGames.map((game) => (
                      <div key={game.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">
                            <Link href={`/games/${game.id}`} className="hover:underline">
                              {formatDate(game.date)}
                              {game.venue && ` @ ${game.venue}`}
                            </Link>
                          </h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>プレイヤー</TableHead>
                                <TableHead className="text-right">得点</TableHead>
                                <TableHead className="text-right">順位</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {game.players.sort((a, b) => a.rank - b.rank).map((player) => (
                                <TableRow key={`${game.id}-${player.id}`}>
                                  <TableCell>
                                    <Link href={`/players/${player.id}`} className="hover:underline">
                                      {player.name}
                                    </Link>
                                  </TableCell>
                                  <TableCell className="text-right">{player.score.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`
                                      inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium
                                      ${player.rank === 1 ? 'bg-amber-100 text-amber-800' :
                                        player.rank === 2 ? 'bg-slate-100 text-slate-800' :
                                        player.rank === 3 ? 'bg-orange-100 text-orange-800' :
                                        'bg-gray-100 text-gray-800'}
                                    `}>
                                      {player.rank}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <Card className="h-full">
                            <CardHeader>
                              <CardTitle className="text-base">{formatDate(game.date)}の結果</CardTitle>
                              {game.venue && <CardDescription className="text-xs">会場: {game.venue}</CardDescription>}
                            </CardHeader>
                            <CardContent className="h-[240px]">
                              <PlayerScoreChart
                                gameResults={game.players}
                              />
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">データがありません</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>プレイヤー統計</CardTitle>
                <CardDescription>
                  全プレイヤーの成績統計
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.topPlayers.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">データがありません</p>
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>プレイヤー別合計得点</CardTitle>
                <CardDescription>全対局の合計得点</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
