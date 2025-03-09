// プレイヤー情報の型定義
export interface Player {
  id: string;
  name: string;
  created_at: string;
}

// 半荘（ゲーム）の型定義
export interface Game {
  id: string;
  date: string;
  venue: string;
  created_at: string;
}

// 半荘の結果の型定義
export interface GameResult {
  id: string;
  game_id: string;
  player_id: string;
  rank: number; // 順位（1-4）
  score: number; // 点数
  point: number; // ポイント（例：+12, +4, -4, -12）
  created_at: string;
}

// 日別集計の型定義
export interface DailySummary {
  date: string;
  player_id: string;
  games_played: number;
  total_points: number;
  average_rank: number;
  first_place_count: number;
  rank_point: number; // 日別順位点（1位: 10点, 2位: 6点, 3位: 3点）
}

// プレイヤー統計の型定義
export interface PlayerStats {
  player_id: string;
  player_name: string;
  games_played: number;
  total_points: number;
  average_points: number;
  average_rank: number;
  first_place_rate: number;
  fourth_place_rate: number;
}