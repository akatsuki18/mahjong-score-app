"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface PlayerScoreChartProps {
  gameResults: {
    id: string;
    name: string;
    score: number;
    rank: number;
  }[];
  title?: string;
  description?: string;
}

export function PlayerScoreChart({ gameResults, title = "対局結果", description }: PlayerScoreChartProps) {
  // ランクが0の場合（統計表示用）、スコアに基づいてランク付け
  const resultsWithRank = gameResults.map(player => {
    if (player.rank === 0) {
      return { ...player };
    }
    return player;
  });

  // スコアでソート
  const sortedResults = [...resultsWithRank].sort((a, b) => b.score - a.score);

  // ランクが0の場合、スコア順にランク付け
  if (resultsWithRank.some(p => p.rank === 0)) {
    sortedResults.forEach((player, index) => {
      if (player.rank === 0) {
        player.rank = index + 1;
      }
    });
  }

  // データを整形
  const chartData = [
    {
      name: "得点",
      ...sortedResults.reduce((acc, player) => {
        // プレイヤーIDをキーとして使用（文字列に変換）
        acc[`player_${player.id}`] = player.score;
        return acc;
      }, {} as Record<string, number>)
    }
  ];

  // チャート設定
  const chartConfig = sortedResults.reduce((acc, player) => {
    // プレイヤーIDをキーとして使用（文字列に変換）
    acc[`player_${player.id}`] = {
      label: player.name,
      color: getRankColor(player.rank),
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              {sortedResults.map((player) => (
                <Bar
                  key={player.id}
                  dataKey={`player_${player.id}`}
                  fill={getRankColor(player.rank)}
                  name={player.name}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// 順位に基づいた色を返す関数
function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return "hsl(47, 100%, 50%)"; // 金色
    case 2:
      return "hsl(0, 0%, 75%)";    // 銀色
    case 3:
      return "hsl(30, 100%, 50%)"; // 銅色
    case 4:
      return "hsl(220, 100%, 50%)"; // 青色
    default:
      return "hsl(220, 14%, 50%)";  // グレー
  }
}