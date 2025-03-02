'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Game, GameResult, Player } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, Edit } from "lucide-react";

// 結果表示用の型
interface GameResultWithPlayer extends GameResult {
  player: Player;
  hanso_number: number;
}

// 半荘ごとの結果をグループ化するための型
interface HansoResults {
  [hansoNumber: number]: GameResultWithPlayer[];
}

export default function GameDetailPage({ params }: { params: { id: string } }) {
  const [game, setGame] = useState<Game | null>(null);
  const [results, setResults] = useState<GameResultWithPlayer[]>([]);
  const [hansoResults, setHansoResults] = useState<HansoResults>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGameDetails() {
      try {
        setLoading(true);
        const gameId = params.id;

        // ゲーム情報を取得
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (gameError) throw gameError;
        setGame(gameData);

        // ゲーム結果を取得（プレイヤー情報も含む）
        const { data: resultsData, error: resultsError } = await supabase
          .from("game_results")
          .select("*, player:players(*)")
          .eq("game_id", gameId)
          .order("hanso_number, rank");

        if (resultsError) throw resultsError;
        setResults(resultsData);

        // 半荘ごとに結果をグループ化
        const groupedResults: HansoResults = {};
        resultsData.forEach((result: GameResultWithPlayer) => {
          const hansoNumber = result.hanso_number || 1; // デフォルトは1
          if (!groupedResults[hansoNumber]) {
            groupedResults[hansoNumber] = [];
          }
          groupedResults[hansoNumber].push(result);
        });

        setHansoResults(groupedResults);
      } catch (err: Error | unknown) {
        console.error("ゲーム詳細取得エラー:", err);
        setError(err instanceof Error ? err.message : "ゲーム詳細の取得中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    }

    fetchGameDetails();
  }, [params.id]);

  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日(E)', { locale: ja });
    } catch (_) {
      return dateString;
    }
  };

  // プレイヤーごとの合計得点を計算
  const calculateTotalScores = () => {
    if (!results.length) return {};

    const totals: { [playerId: string]: number } = {};

    results.forEach(result => {
      const playerId = result.player.id;
      if (!totals[playerId]) {
        totals[playerId] = 0;
      }
      totals[playerId] += result.score;
    });

    return totals;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-red-500">{error}</p>
        <Link href="/games" passHref>
          <Button variant="outline">対局一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground">対局が見つかりませんでした</p>
        <Link href="/games" passHref>
          <Button variant="outline">対局一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  // 半荘の数を取得
  const hansoNumbers = Object.keys(hansoResults).map(Number).sort((a, b) => a - b);

  // 全プレイヤーを取得（重複なし）
  const allPlayers = results.reduce((acc: Player[], result) => {
    if (!acc.some(p => p.id === result.player.id)) {
      acc.push(result.player);
    }
    return acc;
  }, []);

  // プレイヤーごとの合計得点
  const totalScores = calculateTotalScores();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/games" passHref>
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <ArrowLeft size={16} />
              <span>戻る</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">対局詳細</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Link href={`/games/${params.id}/edit`} passHref>
            <Button variant="outline" className="flex items-center gap-1">
              <Edit size={16} />
              <span>編集</span>
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>対局情報</CardTitle>
          <CardDescription>
            {formatDate(game.date)}に行われた対局の詳細情報
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">日付</h3>
              <p>{formatDate(game.date)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">場所</h3>
              <p>{game.venue || "未設定"}</p>
            </div>
          </div>

          <div className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">半荘</TableHead>
                  {allPlayers.map((player) => (
                    <TableHead key={player.id} className="text-center">
                      <div className="font-medium">{player.name}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {hansoNumbers.map((hansoNumber) => {
                  const hansoData = hansoResults[hansoNumber];

                  return (
                    <TableRow key={`hanso-${hansoNumber}`}>
                      <TableCell className="font-medium">#{hansoNumber}</TableCell>
                      {allPlayers.map((player) => {
                        const playerResult = hansoData.find(r => r.player.id === player.id);

                        return (
                          <TableCell
                            key={`score-${hansoNumber}-${player.id}`}
                            className="text-center"
                          >
                            {playerResult ? (
                              <div>
                                <span className="font-medium">{playerResult.score.toLocaleString()}</span>
                                <span className={`
                                  ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium
                                  ${playerResult.rank === 1 ? 'bg-amber-100 text-amber-800' :
                                    playerResult.rank === 2 ? 'bg-slate-100 text-slate-800' :
                                    playerResult.rank === 3 ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'}
                                `}>
                                  {playerResult.rank}
                                </span>
                              </div>
                            ) : "-"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}

                {/* 合計行 */}
                <TableRow className="border-t-2 border-gray-200">
                  <TableCell className="font-bold">合計</TableCell>
                  {allPlayers.map((player) => (
                    <TableCell
                      key={`total-${player.id}`}
                      className="text-center font-bold"
                    >
                      {totalScores[player.id]?.toLocaleString() || 0}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}