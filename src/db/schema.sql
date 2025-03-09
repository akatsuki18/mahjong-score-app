-- プレイヤーテーブル
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- 対局テーブル
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  venue TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- 対局結果テーブル
CREATE TABLE IF NOT EXISTS game_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 4),
  score INTEGER NOT NULL,
  point INTEGER NOT NULL,
  hanso_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id, hanso_number),
  UNIQUE(game_id, rank, hanso_number)
);

-- RLSを有効化
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_game_results_game_id ON game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);

-- プレイヤー統計ビュー (SECURITY INVOKERがデフォルト)
CREATE OR REPLACE VIEW player_stats AS
SELECT
  p.id AS player_id,
  p.name AS player_name,
  COUNT(DISTINCT gr.game_id) AS games_played,
  SUM(gr.point) AS total_points,
  CASE WHEN COUNT(gr.id) > 0 THEN ROUND(AVG(gr.score), 0) ELSE 0 END AS average_points,
  CASE WHEN COUNT(gr.id) > 0 THEN ROUND(AVG(gr.rank), 2) ELSE 0 END AS average_rank,
  CASE WHEN COUNT(gr.id) > 0 THEN ROUND((SUM(CASE WHEN gr.rank = 1 THEN 1 ELSE 0 END)::NUMERIC / COUNT(gr.id)) * 100, 2) ELSE 0 END AS first_place_rate,
  CASE WHEN COUNT(gr.id) > 0 THEN ROUND((SUM(CASE WHEN gr.rank = 4 THEN 1 ELSE 0 END)::NUMERIC / COUNT(gr.id)) * 100, 2) ELSE 0 END AS fourth_place_rate
FROM
  players p
LEFT JOIN
  game_results gr ON p.id = gr.player_id
GROUP BY
  p.id, p.name;

-- 日別集計ビュー (SECURITY INVOKERがデフォルト)
CREATE OR REPLACE VIEW daily_summary AS
WITH daily_ranks AS (
  SELECT
    g.date,
    gr.player_id,
    SUM(gr.point) AS total_points,
    ROW_NUMBER() OVER (PARTITION BY g.date ORDER BY SUM(gr.point) DESC) AS daily_rank
  FROM
    games g
  JOIN
    game_results gr ON g.id = gr.game_id
  GROUP BY
    g.date, gr.player_id
)
SELECT
  g.date,
  gr.player_id,
  COUNT(DISTINCT g.id) AS games_played,
  SUM(gr.point) AS total_points,
  CASE WHEN COUNT(gr.id) > 0 THEN ROUND(AVG(gr.rank), 2) ELSE 0 END AS average_rank,
  SUM(CASE WHEN gr.rank = 1 THEN 1 ELSE 0 END) AS first_place_count,
  CASE
    WHEN dr.daily_rank = 1 THEN 10
    WHEN dr.daily_rank = 2 THEN 6
    WHEN dr.daily_rank = 3 THEN 3
    ELSE 0
  END AS rank_point
FROM
  games g
JOIN
  game_results gr ON g.id = gr.game_id
JOIN
  daily_ranks dr ON g.date = dr.date AND gr.player_id = dr.player_id
GROUP BY
  g.date, gr.player_id, dr.daily_rank;

-- RLSポリシーの作成
-- すべてのユーザーが読み取り可能
CREATE POLICY "Enable read access for all users" ON players FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON games FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON game_results FOR SELECT USING (true);

-- 認証されたユーザーのみが書き込み可能
CREATE POLICY "Enable insert for authenticated users only" ON players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON players FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON players FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users only" ON games FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON games FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON games FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users only" ON game_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON game_results FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON game_results FOR DELETE USING (auth.role() = 'authenticated');

-- hansos テーブルのRLS有効化（テーブル定義がスキーマに含まれていないため、既存テーブルと仮定）
ALTER TABLE IF EXISTS hansos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON hansos FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON hansos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON hansos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON hansos FOR DELETE USING (auth.role() = 'authenticated');