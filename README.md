# 麻雀スコア管理アプリ

麻雀の対局結果を記録・管理するためのWebアプリケーションです。

## 機能

- プレイヤー管理（登録、一覧表示、詳細表示）
- 対局記録（登録、一覧表示、詳細表示）
- 統計情報（プレイヤー別、日別、月別）
- ダッシュボード（概要、最近の対局、統計）

## 技術スタック

- **フロントエンド**: Next.js, TypeScript, Tailwind CSS, Shadcn UI
- **バックエンド**: Supabase (PostgreSQL)
- **デプロイ**: Vercel

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd mahjong-score-app
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

このアプリケーションを実行するには、Supabaseの認証情報を設定する必要があります。

1. `.env.example`ファイルを`.env.local`としてコピーします
2. `.env.local`ファイルに以下の情報を設定します：
   - `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの匿名キー

これらの値はSupabaseのダッシュボードから取得できます。

### 4. Supabaseのテーブル設定

Supabaseのダッシュボードで、以下のSQLを実行してテーブルを作成します：

1. Supabaseダッシュボード（https://app.supabase.com）にログイン
2. プロジェクトを選択
3. 「SQL Editor」を開く
4. `src/db/schema.sql`の内容をコピーして実行

または、以下のコマンドでSQLファイルを実行することもできます：

```bash
supabase db push
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## デプロイ

Vercelを使用してデプロイする場合：

1. Vercelアカウントを作成
2. プロジェクトをインポート
3. 環境変数を設定
4. デプロイ

## ライセンス

MIT

## データベース構造

このアプリケーションは以下のテーブルを使用します：

- `players`: プレイヤー情報
- `games`: 対局情報
- `game_results`: 対局結果

## 開発方法

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。
