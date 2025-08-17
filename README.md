# 日本語トークン効率最適化ツール

**Deno + Fresh + Deno
KV**を使用した、日本語文章のトークン効率を最適化するWebアプリケーションです。

## 🎯 概要

このツールは、入力された日本語文章を解析し、**Sudachi同義語辞書**と**実際のトークン数計測**を使用して、**読みやすさを保ちながら**より効率的な日本語表現に自動変換します。

### 主な機能

- 📝 **日本語文章の入力・編集**
- 🔄 **リアルタイム最適化処理**
- 📊 **トークン数の比較表示**
- 📋 **最適化結果のワンクリックコピー**
- 📱 **レスポンシブ対応UI**
- 🗄️ **高速KVストレージによる辞書管理**
- 🕐 **毎日自動辞書更新（Deno Cron）**

## 🛠️ 技術仕様

### フレームワーク・ライブラリ

- **[Deno](https://deno.dev/)** - モダンなJavaScript/TypeScriptランタイム
- **[Fresh](https://fresh.deno.dev/)** - Denoベースの高速Webフレームワーク
- **[Deno KV](https://deno.land/manual/runtime/kv)** -
  高性能なKey-Valueストレージ
- **[Deno Cron](https://docs.deno.com/deploy/kv/manual/cron/)** -
  スケジュールタスク実行
- **[Preact](https://preactjs.com/)** - 軽量なReactライク
- **[TailwindCSS](https://tailwindcss.com/)** - ユーティリティファーストCSS

### 最適化エンジン

- **[wakachigaki](https://github.com/yuhsak/wakachigaki)** - 日本語形態素解析
- **[Sudachi同義語辞書](https://github.com/WorksApplications/SudachiDict)** -
  15,085個の同義語マッピング + 64,747個の辞書単語
- **[js-tiktoken](https://www.npmjs.com/package/js-tiktoken)** -
  GPT-4o互換トークン数計測(o200k_base)

## 🚀 セットアップ

### 前提条件

- [Deno](https://deno.land/manual/getting_started/installation) 2.0以上
- [mise](https://mise.jdx.dev/) (開発環境管理、オプション)

### インストール・起動

```bash
# リポジトリをクローン
git clone <repository-url>
cd jp_token_compressor

# KV辞書を初期化（初回のみ）
deno run -A --unstable-kv scripts/init-kv.ts

# 開発サーバーを起動
deno task start
```

アプリケーションは `http://localhost:8000` で利用できます。

## 📖 使い方

1. **文章入力**: 左側のテキストエリアに最適化したい日本語文章を入力
2. **最適化実行**: 「最適化実行」ボタンをクリック
3. **結果確認**: 右側に最適化された文章とトークン数の比較が表示
4. **コピー**: 「コピー」ボタンで最適化結果をクリップボードにコピー

### ⚡ パフォーマンス

**Deno KVによる高速辞書アクセス**

- KVストレージによる瞬時の辞書検索
- メモリ効率的な設計
- 常に最新の辞書データ（毎日自動更新）

### 🕐 自動辞書更新システム

**Deno Cronによる完全自動化**

このアプリケーションは、**Deno
Cron**を使用して辞書データを完全自動で最新に保ちます：

- **スケジュール**: 毎日深夜2:00 AM（JST）に実行
- **更新判定**: 前回更新から24時間以上経過時のみ実行
- **自動処理**: 最新のSudachi辞書をダウンロード・解析・KVに保存
- **ログ出力**: 更新状況とパフォーマンス統計を詳細ログ
- **エラー処理**: 更新失敗時の適切なエラーハンドリング

```typescript
// cron.ts - 毎日自動実行される辞書更新
// JST深夜2:00 AM = UTC 17:00 (前日)
Deno.cron("Update Sudachi Dictionary", "0 17 * * *", async () => {
  await updateDictionary();
});
```

これにより、ユーザーは常に最新の同義語データでトークン最適化を利用できます。

### 便利な機能

- **キーボードショートカット**: `Ctrl + Enter`で最適化実行
- **クリア機能**: 入力欄を一括クリア
- **リアルタイムフィードバック**: 処理中のローディング表示

## 🔧 開発

### 利用可能なコマンド

```bash
# 開発サーバー起動（ホットリロード）
deno task start

# KV辞書の初期化・再構築（ローカル）
deno run -A --unstable-kv scripts/init-kv.ts

# KV辞書の初期化・再構築（リモート）
deno run -A --unstable-kv scripts/init-kv.ts --remote

# .envファイルを使用する場合
deno run -A --unstable-kv --env-file=.env scripts/init-kv.ts --remote

# 本番ビルド
deno task build

# 本番サーバー起動
deno task preview

# コード品質チェック（lint + format + type-check）
deno task check
```

### 🚀 デプロイ（Deno Deploy）

```bash
# 1. 本番ビルド
deno task build

# 2. Deno Deployへデプロイ
deployctl deploy --project=your-project main.ts

# 3. アクセストークンとデータベースIDを設定（環境変数または.envファイル）
export DENO_KV_ACCESS_TOKEN="your_access_token_here"
export DENO_KV_DATABASE_ID="your_database_id_here"
# または .envファイルに以下を記載:
# DENO_KV_ACCESS_TOKEN=your_access_token_here
# DENO_KV_DATABASE_ID=your_database_id_here

# 4. リモートKV辞書を初期化
deno run -A --unstable-kv scripts/init-kv.ts --remote
# .envファイルを使用する場合:
# deno run -A --unstable-kv --env-file=.env scripts/init-kv.ts --remote
```

**🔐 KVアクセストークンとデータベースIDの取得方法:**

1. [Deno Deploy Dashboard](https://dash.deno.com/)にアクセス
2. プロジェクト → KV → KVデータベースを選択
3. "Connect to this database from Deno CLI" セクションから:
   - データベースID（URL内の UUID）を`DENO_KV_DATABASE_ID`に設定
4. "Set up access tokens for Deno CLI" から:
   - 生成されたトークンを`DENO_KV_ACCESS_TOKEN`に設定

**✨ Deno KVによる本番環境の利点:**

- **高性能**: KVストレージによる瞬時の辞書アクセス
- **自動更新**: Deno Cronによる毎日深夜2時（JST）の自動辞書更新
- **メンテナンス不要**: 辞書の更新・管理が完全自動化
- **スケーラビリティ**: Deno Deployの自動スケーリング対応
- **データ永続化**: クラウドベースの永続化ストレージ

**🤖 Deno Cronによる自動メンテナンス:**

```typescript
// 本番環境で自動実行される処理
- 毎日2:00 AM JST: 辞書更新チェック・実行
- 更新判定: 24時間以上経過時のみ実行
- 自動ログ: 更新状況の詳細記録
- エラー回復: 失敗時の適切なエラーハンドリング
```

**📅 Cron設定の確認方法:**

Deno Deployでデプロイ後、Cronジョブが正しく登録されているかを確認：

1. [Deno Deploy Dashboard](https://dash.deno.com/)にアクセス
2. プロジェクト → **Cron** タブを選択
3. "Update Sudachi Dictionary" ジョブが表示されることを確認
4. スケジュール: `0 17 * * *` (UTC 17:00 = JST 2:00 AM)

**⚠️ 重要**:
`main.ts`で`cron.ts`をimportしているため、アプリケーションの起動時にCronジョブが自動的に登録されます。

### コード品質管理

このプロジェクトでは**lefthook**を使用して、Git
commit時に自動的に以下を実行します：

- **Lint**: `deno lint` - コード品質チェック
- **Format**: `deno fmt` - コードフォーマット
- **Type Check**: `deno check` - TypeScript型チェック

## 🎛️ 最適化の仕組み

### 処理フロー

1. **形態素解析**: wakachigakiで日本語文章を単語に分割
2. **同義語検索**: 各単語についてSudachi辞書から同義語候補を取得
3. **トークン効率評価**: js-tiktokenで各候補の実際のトークン数を計測
4. **最適置換**: 最もトークン効率の良い単語に置換
5. **結果表示**: 元の文章と最適化後の文章、トークン数を比較表示

### 最適化例

```
入力:  「コンピュータとアルゴリズムを活用したデータベースシステム」(21トークン)
出力:  「電算機とアルゴリズムを使用したデータベースシステム」(19トークン)  
効果:  約10%のトークン削減（コンピュータ→電算機、活用→使用）
```

### 🔒 最適化ポリシー

- **日本語のみ**: 英語への変換は行わず、可読性を重視
- **全ての削減効果**: トークン削減効果のある変換をすべて適用
- **品質重視**: 15,085個の厳選されたマッピングを使用
- **複合語対応**: 部分マッチによる複合語内最適化

## 📁 プロジェクト構成

```
jp_token_compressor/
├── routes/
│   ├── api/
│   │   └── optimize.ts       # 最適化APIエンドポイント
│   ├── index.tsx            # メインページ
│   ├── _app.tsx             # アプリケーションルート
│   └── _404.tsx             # 404ページ
├── islands/
│   └── TextOptimizer.tsx    # クライアントサイド処理
├── scripts/
│   └── init-kv-dict.ts      # KV辞書初期化スクリプト
├── utils/
│   └── kv.ts               # KVストレージユーティリティ
├── static/                  # 静的ファイル
├── cron.ts                 # Deno Cron定義（毎日辞書更新）
├── deno.json               # Denoプロジェクト設定
├── lefthook.yml            # Git hooks設定
└── fresh.config.ts         # Fresh設定
```

## 🔗 関連リンク

- [Deno公式ドキュメント](https://docs.deno.com/)
- [Fresh公式ドキュメント](https://fresh.deno.dev/docs)
- [Deno KVドキュメント](https://deno.land/manual/runtime/kv)
- [Deno Cronドキュメント](https://docs.deno.com/deploy/kv/manual/cron/)
- [Sudachi辞書プロジェクト](https://github.com/WorksApplications/SudachiDict)
- [wakachigaki](https://github.com/yuhsak/wakachigaki)

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
