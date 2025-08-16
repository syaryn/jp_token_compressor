# 日本語トークン効率最適化ツール

**Deno +
Fresh**を使用した、日本語文章のトークン効率を最適化するWebアプリケーションです。

## 🎯 概要

このツールは、入力された日本語文章を解析し、**Sudachi同義語辞書**と**実際のトークン数計測**を使用して、**読みやすさを保ちながら**より効率的な日本語表現に自動変換します。

### 主な機能

- 📝 **日本語文章の入力・編集**
- 🔄 **リアルタイム最適化処理**
- 📊 **トークン数の比較表示**
- 📋 **最適化結果のワンクリックコピー**
- 📱 **レスポンシブ対応UI**

## 🛠️ 技術仕様

### フレームワーク・ライブラリ

- **[Deno](https://deno.dev/)** - モダンなJavaScript/TypeScriptランタイム
- **[Fresh](https://fresh.deno.dev/)** - Denoベースの高速Webフレームワーク
- **[Preact](https://preactjs.com/)** - 軽量なReactライク
- **[TailwindCSS](https://tailwindcss.com/)** - ユーティリティファーストCSS

### 最適化エンジン

- **[wakachigaki](https://github.com/yuhsak/wakachigaki)** - 日本語形態素解析
- **[Sudachi同義語辞書](https://github.com/WorksApplications/SudachiDict)** -
  35,178個の同義語マッピング
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

# 開発サーバーを起動
deno task start
```

アプリケーションは `http://localhost:8000` で利用できます。

## 📖 使い方

1. **文章入力**: 左側のテキストエリアに最適化したい日本語文章を入力
2. **最適化実行**: 「最適化実行」ボタンをクリック
3. **結果確認**: 右側に最適化された文章とトークン数の比較が表示
4. **コピー**: 「コピー」ボタンで最適化結果をクリップボードにコピー

### ⚠️ 初回実行について

**初回の最適化実行時は10-20秒程度時間がかかります**

- Sudachi同義語辞書（1.5MB）のダウンロードと解析
- 35,178個の同義語マッピング構築
- 2回目以降は高速で動作します

### 便利な機能

- **キーボードショートカット**: `Ctrl + Enter`で最適化実行
- **クリア機能**: 入力欄を一括クリア
- **リアルタイムフィードバック**: 処理中のローディング表示

## 🔧 開発

### 利用可能なコマンド

```bash
# 開発サーバー起動（ホットリロード）
deno task start

# 同義語辞書の事前構築（デプロイ時自動実行）
deno task prepare-dict

# 本番ビルド（辞書事前構築 + ビルド）
deno task build

# 本番サーバー起動
deno task preview

# コード品質チェック（lint + format + type-check）
deno task check
```

### 🚀 デプロイ（Deno Deploy）

```bash
# 1. 辞書事前構築 + ビルド
deno task build

# 2. Deno Deployへデプロイ
deployctl deploy --project=your-project main.ts
```

**✨ デプロイ時の最適化機能:**

- 事前構築された同義語辞書（1.1MB）が `/synonym-dict.json` として配信
- 初回実行時の待機時間を **10-20秒 → 1秒未満** に大幅短縮
- フォールバック機能で事前構築失敗時も正常動作

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
出力:  「コンピュータとアルゴリズムを使用したデータベースシステム」(20トークン)  
効果:  約5%のトークン削減（活用→使用）
```

### 🔒 最適化ポリシー

- **日本語のみ**: 英語への変換は行わず、可読性を重視
- **効果的な変換**: 20%以上のトークン削減が見込める場合のみ変換
- **品質重視**: 18,228個の厳選されたマッピングを使用

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
├── static/                  # 静的ファイル
├── deno.json               # Denoプロジェクト設定
├── lefthook.yml            # Git hooks設定
└── fresh.config.ts         # Fresh設定
```

## 🔗 関連リンク

- [Deno公式ドキュメント](https://docs.deno.com/)
- [Fresh公式ドキュメント](https://fresh.deno.dev/docs)
- [Sudachi辞書プロジェクト](https://github.com/WorksApplications/SudachiDict)
- [wakachigaki](https://github.com/yuhsak/wakachigaki)

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
