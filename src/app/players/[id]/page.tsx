'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Player } from "@/types";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";

// プレイヤー情報を取得する関数
async function getPlayer(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("プレイヤー取得エラー:", error);
    return null;
  }

  return data;
}

interface Game {
  id: string;
  date: string;
  venue: string | null;
}

interface GameResult {
  id: string;
  player_id: string;
  game_id: string;
  rank: number;
  score: number;
  point: number;
  game?: Game;
}

// プレイヤーの対局結果を取得する関数
async function getPlayerResults(playerId: string): Promise<GameResult[]> {
  // まずgame_resultsのデータを取得
  const { data: resultsData, error: resultsError } = await supabase
    .from("game_results")
    .select("*")
    .eq("player_id", playerId);

  if (resultsError) {
    console.error("対局結果取得エラー:", resultsError);
    return [];
  }

  if (!resultsData || resultsData.length === 0) {
    return [];
  }

  // 関連するゲームIDを抽出
  const gameIds = resultsData.map(result => result.game_id);

  // gamesテーブルからデータを取得
  const { data: gamesData, error: gamesError } = await supabase
    .from("games")
    .select("*")
    .in("id", gameIds);

  if (gamesError) {
    console.error("ゲーム情報取得エラー:", gamesError);
    return resultsData as GameResult[];
  }

  // 結果にゲーム情報を結合
  const resultsWithGames = resultsData.map(result => {
    const game = gamesData?.find(g => g.id === result.game_id);
    return {
      ...result,
      game
    };
  });

  // 日付でソート
  return resultsWithGames.sort((a, b) => {
    if (!a.game?.date || !b.game?.date) return 0;
    return new Date(b.game.date).getTime() - new Date(a.game.date).getTime();
  }) as GameResult[];
}

interface PlayerStats {
  games_played: number;
  average_rank: number;
  average_points: number;
  total_points: number;
  first_place_rate: number;
  fourth_place_rate: number;
}

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const playerData = await getPlayer(playerId);
        if (!playerData) {
          notFound();
          return;
        }

        const resultsData = await getPlayerResults(playerId);
        setPlayer(playerData);
        setGameResults(resultsData);

        // 統計情報を計算
        if (resultsData && resultsData.length > 0) {
          const games_played = resultsData.length;
          const total_points = resultsData.reduce((sum, result) => sum + result.score, 0);
          const average_rank = resultsData.reduce((sum, result) => sum + result.rank, 0) / games_played;
          const average_points = total_points / games_played;
          const first_place_count = resultsData.filter(result => result.rank === 1).length;
          const fourth_place_count = resultsData.filter(result => result.rank === 4).length;
          const first_place_rate = (first_place_count / games_played) * 100;
          const fourth_place_rate = (fourth_place_count / games_played) * 100;

          setStats({
            games_played,
            average_rank,
            average_points,
            total_points,
            first_place_rate,
            fourth_place_rate
          });
        }
      } catch (error) {
        console.error("データ読み込みエラー:", error);
      } finally {
        setLoading(false);
      }
    }

    if (playerId) {
      loadData();
    }
  }, [playerId]);

  if (loading || !player) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{player.name}</h1>
        <div className="flex space-x-2">
          <Link href="/players" passHref>
            <Button variant="outline">プレイヤー一覧に戻る</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>プレイヤー情報</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium">名前:</dt>
                <dd>{player.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">登録日:</dt>
                <dd>{new Date(player.created_at).toLocaleDateString("ja-JP")}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>統計情報</CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-medium">半荘数:</dt>
                  <dd>{stats.games_played}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">平均順位:</dt>
                  <dd>{stats.average_rank.toFixed(1)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">平均得点:</dt>
                  <dd>{stats.average_points.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">合計得点:</dt>
                  <dd>{stats.total_points.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">トップ率:</dt>
                  <dd>{stats.first_place_rate.toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">ラス率:</dt>
                  <dd>{stats.fourth_place_rate.toFixed(1)}%</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">統計情報がありません</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>対局履歴</CardTitle>
          <CardDescription>
            このプレイヤーの対局履歴です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日付</TableHead>
                <TableHead>場所</TableHead>
                <TableHead>順位</TableHead>
                <TableHead>得点</TableHead>
                <TableHead>ポイント</TableHead>
                <TableHead className="text-right">詳細</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gameResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    対局記録がありません
                  </TableCell>
                </TableRow>
              ) : (
                gameResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.game ? new Date(result.game.date).toLocaleDateString("ja-JP") : "-"}</TableCell>
                    <TableCell>{result.game?.venue || "-"}</TableCell>
                    <TableCell>{result.rank}位</TableCell>
                    <TableCell>{result.score.toLocaleString()}</TableCell>
                    <TableCell>{result.point > 0 ? `+${result.point}` : result.point}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/games/${result.game_id}`} passHref>
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