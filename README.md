# Qurios — マッチング型オンライン学習SNS

## ⚠️ 重要：起動前の設定

### 1. Supabaseのメール確認を無効化（開発時必須）
ゲストログイン・新規登録後の即時ログインには、Supabaseのメール確認設定をOFFにする必要があります。

1. Supabase Dashboard → Authentication → Settings
2. **"Enable email confirmations"** → **OFF** に変更
3. Save

本番環境では改めて有効化を検討してください。

### 2. 環境変数の設定
```bash
cp .env.example .env.local
# .env.local を各値で埋める
```

**最低限必要な変数：**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Supabase DBのセットアップ
```sql
-- Supabase SQL Editor で実行
-- supabase/migrations/001_initial_schema.sql の内容を実行
```

### 4. インストール & 起動
```bash
npm install
npm run dev
# http://localhost:3000
```

### 5. テストアカウント
開発時は以下でゲストログインが可能（Supabaseのメール確認をOFFにした場合）：
- メール: guest@qurio.demo
- パスワード: GuestDemo2025!

---

## 機能一覧

| 機能 | パス | 説明 |
|------|------|------|
| ランディング | `/` | 紹介ページ |
| ログイン | `/auth/login` | メール/Google/ゲスト |
| 新規登録 | `/auth/register` | 生徒/講師選択 |
| ダッシュボード | `/dashboard` | 学習統計・AI提案 |
| 課題投稿 | `/post` | マッチング開始 |
| Challenge | `/challenge` | Shorts型問題解答 |
| 授業画面 | `/lesson/[id]` | ビデオ通話・タイマー |
| スタディプラン | `/study-plan` | AIスケジュール管理 |
| フレンド | `/social` | フレンド・グループ・フォロー |
| ランキング | `/ranking` | 週間/月間ランキング |
| プロフィール | `/profile` | 編集・バッジ |
| 収益 | `/earnings` | 講師専用 |
| 設定 | `/settings` | 全設定 |
| 通知 | `/notifications` | 一覧 |

## セキュリティ対策
- Supabase RLS（全テーブル行レベルセキュリティ）
- CSPヘッダー
- Zodスキーマによる入力値バリデーション
- レート制限（src/lib/rateLimit.ts）
- 入力サニタイズ（src/lib/sanitize.ts）
- 授業写真の自動削除（DBトリガー）
- Stripe Webhook 署名検証

## 報酬システム
| 月授業回数 | 単価/解答 | 条件 |
|-----------|---------|------|
| 〜29回 | 投稿不可 | — |
| 30〜99回 | ¥0 | 投稿解禁 |
| 100〜399回 | ¥0.2 | — |
| 400〜999回 | ¥0.3 | フォロワー200人以上 |
| 1000〜1599回 | ¥0.5 | フォロワー200人以上 |
| 1600回〜 | ¥0.8 | フォロワー200人以上 |
