'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useState, useEffect } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Player } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

// 半荘の型定義
interface HansoData {
  id: number;
  scores: {
    [playerId: string]: number;
  };
}

export default function NewGamePage() {
  const router = useRouter();
  // プレイヤー一覧を保持する状態
  const [players, setPlayers] = useState<Player[]>([]);
  // 日付と場所の状態
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState<string>("");
  // 選択されたプレイヤーのID
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  // 半荘データの配列
  const [hansoList, setHansoList] = useState<HansoData[]>([
    {
      id: 1,
      scores: {}
    }
  ]);
  // 送信中の状態
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // エラーメッセージ
  const [errorMessage, setErrorMessage] = useState<string>("");

  // プレイヤー一覧を取得
  useEffect(() => {
    async function fetchPlayers() {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("name");

      if (error) {
        console.error("プレイヤー取得エラー:", error);
        return;
      }

      setPlayers(data || []);
    }

    fetchPlayers();
  }, []);

  // プレイヤーの選択状態を切り替える
  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds(prev => {
      // すでに選択されている場合は削除
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }

      // 4人まで選択可能
      if (prev.length < 4) {
        return [...prev, playerId];
      }

      return prev;
    });
  };

  // 半荘を追加する関数
  const addHanso = () => {
    const newId = hansoList.length > 0 ? Math.max(...hansoList.map(h => h.id)) + 1 : 1;
    setHansoList([
      ...hansoList,
      {
        id: newId,
        scores: {}
      }
    ]);
  };

  // 半荘を削除する関数
  const removeHanso = (id: number) => {
    if (hansoList.length <= 1) return; // 最低1つは残す
    setHansoList(hansoList.filter(hanso => hanso.id !== id));
  };

  // スコアを更新する関数
  const updateScore = (hansoId: number, playerId: string, score: number) => {
    setHansoList(hansoList.map(hanso => {
      if (hanso.id === hansoId) {
        return {
          ...hanso,
          scores: {
            ...hanso.scores,
            [playerId]: score
          }
        };
      }
      return hanso;
    }));
  };

  // 順位を計算する関数
  const calculateRanks = (scores: { [playerId: string]: number }): { [playerId: string]: number } => {
    const playerIds = Object.keys(scores);
    if (playerIds.length !== 4) return {};

    // スコアの降順でプレイヤーIDをソート
    const sortedPlayerIds = [...playerIds].sort((a, b) => scores[b] - scores[a]);

    // 順位を割り当て（同点の場合は同じ順位）
    const ranks: { [playerId: string]: number } = {};
    let currentRank = 1;
    let previousScore: number | null = null;

    sortedPlayerIds.forEach((playerId, index) => {
      if (previousScore !== null && scores[playerId] !== previousScore) {
        currentRank = index + 1;
      }
      ranks[playerId] = currentRank;
      previousScore = scores[playerId];
    });

    return ranks;
  };

  // ポイントを計算する関数
  const calculatePoints = (ranks: { [playerId: string]: number }): { [playerId: string]: number } => {
    const pointTable: { [key: number]: number } = {
      1: 12,
      2: 4,
      3: -4,
      4: -12
    };

    const points: { [playerId: string]: number } = {};
    Object.entries(ranks).forEach(([playerId, rank]) => {
      points[playerId] = pointTable[rank] || 0;
    });

    return points;
  };

  // 対局を登録する関数
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (selectedPlayerIds.length !== 4) {
        throw new Error("4人のプレイヤーを選択してください");
      }

      // 各半荘のスコアが入力されているか確認
      for (const hanso of hansoList) {
        const scoreEntries = Object.entries(hanso.scores);
        if (scoreEntries.length !== 4) {
          throw new Error(`半荘 #${hansoList.indexOf(hanso) + 1} の全プレイヤーのスコアを入力してください`);
        }
      }

      // 1. まず対局（ゲーム）を登録
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .insert({
          date,
          venue: venue || null
        })
        .select()
        .single();

      if (gameError) throw gameError;

      const gameId = gameData.id;

      // 2. 各半荘の結果を登録（一度に全て登録）
      // 結果を格納する配列の型を明示的に定義
      interface GameResultInsert {
        game_id: string;
        player_id: string;
        rank: number;
        score: number;
        point: number;
        hanso_number: number;
      }

      // 全ての半荘の結果を格納する配列
      let allGameResults: GameResultInsert[] = [];

      // 各半荘の結果を処理
      hansoList.forEach((hanso, hansoIndex) => {
        // 順位を計算
        const ranks = calculateRanks(hanso.scores);
        // ポイントを計算
        const points = calculatePoints(ranks);

        // 各プレイヤーの結果を作成
        const gameResults = selectedPlayerIds.map(playerId => ({
          game_id: gameId,
          player_id: playerId,
          rank: ranks[playerId],
          score: hanso.scores[playerId],
          point: points[playerId],
          hanso_number: hansoIndex + 1
        }));

        // 結果を追加
        allGameResults = [...allGameResults, ...gameResults];
      });

      // 全ての結果を一度に登録
      const { error: resultsError } = await supabase
        .from("game_results")
        .insert(allGameResults)
        .select();

      if (resultsError) {
        // エラーが発生した場合、詳細なエラーメッセージを表示
        console.error("結果登録エラー:", resultsError);
        throw new Error(`結果の登録中にエラーが発生しました: ${resultsError.message}`);
      }

      // 成功したら対局一覧ページに遷移
      router.push("/games");
    } catch (error: any) {
      console.error("対局登録エラー:", error);
      setErrorMessage(error.message || "対局の登録中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 選択されたプレイヤーの情報を取得
  const getSelectedPlayers = () => {
    return players.filter(player => selectedPlayerIds.includes(player.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">新規対局登録</h1>
        <Link href="/games" passHref>
          <Button variant="outline">対局一覧に戻る</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>対局情報</CardTitle>
          <CardDescription>
            新しい対局の情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="date" className="text-sm font-medium">
                    日付
                  </label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    className="w-full p-2 border rounded-md"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="venue" className="text-sm font-medium">
                    場所
                  </label>
                  <input
                    id="venue"
                    name="venue"
                    type="text"
                    placeholder="対局場所"
                    className="w-full p-2 border rounded-md"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">プレイヤー選択（4名）</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`player-${player.id}`}
                      checked={selectedPlayerIds.includes(player.id)}
                      onCheckedChange={() => togglePlayerSelection(player.id)}
                      disabled={!selectedPlayerIds.includes(player.id) && selectedPlayerIds.length >= 4}
                    />
                    <Label
                      htmlFor={`player-${player.id}`}
                      className="cursor-pointer"
                    >
                      {player.name}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedPlayerIds.length !== 4 && (
                <p className="text-sm text-amber-600">4名のプレイヤーを選択してください（現在: {selectedPlayerIds.length}名）</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">半荘成績</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addHanso}
                  className="flex items-center gap-1"
                >
                  <PlusCircle size={16} />
                  <span>半荘を追加</span>
                </Button>
              </div>

              {selectedPlayerIds.length === 4 ? (
                <div className="border rounded-md p-4">
                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="font-medium text-center"></div>
                    {getSelectedPlayers().map((player) => (
                      <div key={player.id} className="font-medium text-center">
                        {player.name}
                      </div>
                    ))}
                  </div>

                  {hansoList.map((hanso, hansoIndex) => (
                    <div key={hanso.id} className="grid grid-cols-5 gap-4 items-center mb-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">半荘 #{hansoIndex + 1}</span>
                        {hansoList.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeHanso(hanso.id)}
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>

                      {getSelectedPlayers().map((player) => (
                        <div key={player.id}>
                          <input
                            type="number"
                            placeholder="25000"
                            className="w-full p-2 border rounded-md"
                            value={hanso.scores[player.id] !== undefined ? hanso.scores[player.id] : ""}
                            onChange={(e) => {
                              const value = e.target.value === "" ? "" : parseInt(e.target.value);
                              updateScore(hanso.id, player.id, value === "" ? 0 : value);
                            }}
                            required
                            aria-label={`${player.name}の得点`}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-md p-6 text-center text-muted-foreground">
                  プレイヤーを4名選択すると半荘成績を入力できます
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Link href="/games" passHref>
                <Button type="button" variant="outline">キャンセル</Button>
              </Link>
              <Button
                type="submit"
                disabled={selectedPlayerIds.length !== 4 || isSubmitting}
              >
                {isSubmitting ? "登録中..." : "登録する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}