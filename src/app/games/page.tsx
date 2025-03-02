'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Game, Player } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { PlusCircle, Trash2, Edit } from "lucide-react";

// ゲーム一覧に表示するためのデータ型
interface GameListItem extends Game {
  players: Player[];
  winner?: Player;
}

export default function GamesPage() {
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true);

        // ゲーム一覧を取得
        const { data: gamesData, error: gamesError } = await supabase
          .from("games")
          .select("*")
          .order("date", { ascending: false });

        if (gamesError) throw gamesError;

        // 各ゲームの詳細情報を取得
        const gamesWithDetails = await Promise.all((gamesData || []).map(async (game) => {
          // ゲーム結果を取得
          const { data: resultsData, error: resultsError } = await supabase
            .from("game_results")
            .select("*, player:players(*)")
            .eq("game_id", game.id);

          if (resultsError) throw resultsError;

          // 参加プレイヤーを抽出（重複を排除）
          const uniquePlayers: Player[] = [];
          resultsData?.forEach(result => {
            const player = result.player;
            if (!uniquePlayers.some(p => p.id === player.id)) {
              uniquePlayers.push(player);
            }
          });

          // 優勝者（1位のプレイヤー）を特定
          const winner = resultsData?.find(result => result.rank === 1)?.player;

          return {
            ...game,
            players: uniquePlayers,
            winner
          };
        }));

        setGames(gamesWithDetails);
      } catch (err: Error | unknown) {
        console.error("ゲーム一覧取得エラー:", err);
        setError(err instanceof Error ? err.message : "ゲーム一覧の取得中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, []);

  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日(E)', { locale: ja });
    } catch (e) {
      return dateString;
    }
  };

  const handleDelete = async (gameId: string) => {
    if (!confirm("この対局を削除してもよろしいですか？")) return;

    try {
      const { error: deleteError } = await supabase
        .from("games")
        .delete()
        .eq("id", gameId);

      if (deleteError) throw deleteError;

      // ... existing code ...
    } catch (error: Error | unknown) {
      // ... existing code ...
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">対局記録</h1>
        <Link href="/games/new" passHref>
          <Button>新規対局登録</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>対局履歴</CardTitle>
          <CardDescription>
            これまでに記録された対局の一覧です
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6 text-red-500">
              <p>{error}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>場所</TableHead>
                  <TableHead>参加者</TableHead>
                  <TableHead>優勝者</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      対局記録がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  games.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>{formatDate(game.date)}</TableCell>
                      <TableCell>{game.venue || "未設定"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {game.players.map((player) => (
                            <span key={player.id} className="inline-block bg-slate-100 px-2 py-1 rounded text-xs">
                              {player.name}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {game.winner ? (
                          <span className="font-medium text-amber-600">{game.winner.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/games/${game.id}`} passHref>
                            <Button variant="outline" size="sm">詳細</Button>
                          </Link>
                          <Link href={`/games/${game.id}/edit`} passHref>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <Edit size={14} />
                              <span>編集</span>
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}