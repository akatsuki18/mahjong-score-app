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
import { useParams } from "next/navigation";

// 結果表示用の型
interface GameResultWithPlayer extends GameResult {
  player: Player;
  hanso_number: number;
}

// 半荘ごとの結果をグループ化するための型
interface HansoResults {
  [hansoNumber: number]: GameResultWithPlayer[];
}

export default function GameDetailPage() {
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [results, setResults] = useState<GameResultWithPlayer[]>([]);
  const [hansoResults, setHansoResults] = useState<HansoResults>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ゲーム情報と結果を取得
  useEffect(() => {
    async function fetchGameDetails() {
      try {
        setLoading(true);

        // ゲーム情報を取得
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (gameError) throw gameError;
        setGame(gameData);

        // ゲーム結果を取得
        const { data: resultsData, error: resultsError } = await supabase
          .from("game_results")
          .select(`
            *,
            player:players(*)
          `)
          .eq("game_id", gameId);

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
        console.error("データ取得エラー:", err);
        setError(err instanceof Error ? err.message : "データの取得中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    }

    if (gameId) {
      fetchGameDetails();
    }
  }, [gameId]);

  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy年MM月dd日", { locale: ja });
    } catch (_) {
      return dateString;
    }
  };

  // 読み込み中の表示
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg">読み込み中...</p>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-red-500">{error}</p>
      </div>
    );
  }

  // ゲームが見つからない場合
  if (!game) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg">対局が見つかりませんでした</p>
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
  const totalScores: { [playerId: string]: number } = {};
  results.forEach(result => {
    if (!totalScores[result.player.id]) {
      totalScores[result.player.id] = 0;
    }
    totalScores[result.player.id] += result.score;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/games" passHref>
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <ArrowLeft size={16} />
              対局一覧に戻る
            </Button>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <Link href={`/games/${gameId}/edit`} passHref>
            <Button variant="outline" className="flex items-center gap-1">
              <Edit size={16} />
              編集
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>対局詳細</CardTitle>
          <CardDescription>
            {formatDate(game.date)}
            {game.venue && ` @ ${game.venue}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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