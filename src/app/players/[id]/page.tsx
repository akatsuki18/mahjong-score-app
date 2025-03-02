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

// プレイヤーの対局結果を取得する関数
async function getPlayerResults(playerId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from("game_results")
    .select(`
      *,
      games:games(*)
    `)
    .eq("player_id", playerId)
    .order("games.date", { ascending: false });

  if (error) {
    console.error("対局結果取得エラー:", error);
    return [];
  }

  return data || [];
}

// プレイヤーの統計情報を取得する関数
async function getPlayerStats(playerId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .eq("player_id", playerId)
    .single();

  if (error) {
    console.error("プレイヤー統計取得エラー:", error);
    return null;
  }

  return data;
}

interface GameResult {
  id: string;
  player_id: string;
  game_id: string;
  rank: number;
  score: number;
  point: number;
  games: {
    id: string;
    date: string;
    venue: string | null;
  };
}

interface PlayerStats {
  player_id: string;
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
        const statsData = await getPlayerStats(playerId);

        setPlayer(playerData);
        setGameResults(resultsData as unknown as GameResult[]);
        setStats(statsData as unknown as PlayerStats);
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
                  <dt className="font-medium">対局数:</dt>
                  <dd>{stats.games_played}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">平均順位:</dt>
                  <dd>{stats.average_rank}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">平均得点:</dt>
                  <dd>{stats.average_points?.toLocaleString() || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">トータルポイント:</dt>
                  <dd>{stats.total_points || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">トップ率:</dt>
                  <dd>{stats.first_place_rate || 0}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">ラス率:</dt>
                  <dd>{stats.fourth_place_rate || 0}%</dd>
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
                    <TableCell>{new Date(result.games.date).toLocaleDateString("ja-JP")}</TableCell>
                    <TableCell>{result.games.venue || "-"}</TableCell>
                    <TableCell>{result.rank}位</TableCell>
                    <TableCell>{result.score.toLocaleString()}</TableCell>
                    <TableCell>{result.point > 0 ? `+${result.point}` : result.point}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/games/${result.games.id}`} passHref>
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