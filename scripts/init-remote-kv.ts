#!/usr/bin/env -S deno run -A

/**
 * リモートKV辞書初期化スクリプト
 * Deno Deploy環境のKVデータベースに直接辞書データを投入
 */

import { getEncoding } from "js-tiktoken";

const REMOTE_KV_URL =
  "https://api.deno.com/databases/ccd2fe5c-af0d-418a-8668-a315d8c7c38a/connect";

// 環境変数チェック
if (!Deno.env.get("DENO_KV_ACCESS_TOKEN")) {
  console.error("❌ DENO_KV_ACCESS_TOKEN環境変数が設定されていません");
  console.log("📝 以下のコマンドで設定してください：");
  console.log("export DENO_KV_ACCESS_TOKEN=your_token_here");
  Deno.exit(1);
}

interface SynonymMap {
  [key: string]: string;
}

// GPT-4oエンコーダーを初期化
const encoder = getEncoding("o200k_base");

// 実際のトークン数を計測
function getTokenCount(text: string): number {
  return encoder.encode(text).length;
}

// 日本語文字かどうかを判定
function isJapanese(text: string): boolean {
  return /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+$/.test(text);
}

// 英語（アルファベット）かどうかを判定
function isAlphabet(text: string): boolean {
  return /^[a-zA-Z]+$/.test(text);
}

// 最適化が有効かどうかを判定
function shouldOptimize(original: string, optimized: string): boolean {
  // 英語への変換は禁止
  if (isJapanese(original) && isAlphabet(optimized)) {
    return false;
  }

  // アルファベットから日本語への変換も禁止
  if (isAlphabet(original) && isJapanese(optimized)) {
    return false;
  }

  const originalTokens = getTokenCount(original);
  const optimizedTokens = getTokenCount(optimized);

  // トークン数が減る場合のみ有効
  return optimizedTokens < originalTokens;
}

// リモートKVに接続
async function connectToRemoteKv() {
  try {
    const kv = await Deno.openKv(REMOTE_KV_URL);
    console.log("✅ リモートKVデータベースに接続しました");
    return kv;
  } catch (error) {
    console.error("❌ リモートKV接続エラー:", error);
    Deno.exit(1);
  }
}

// 辞書をクリア
async function clearKvDictionary(kv: Deno.Kv): Promise<void> {
  console.log("🧹 既存の辞書データをクリア中...");

  const entries = kv.list({ prefix: ["synonyms"] });
  const deletePromises: Promise<void>[] = [];

  for await (const entry of entries) {
    deletePromises.push(kv.delete(entry.key));
  }

  await Promise.all(deletePromises);
  await kv.delete(["dictionary", "initialized"]);
  await kv.delete(["dictionary", "word_count"]);
  await kv.delete(["dictionary", "last_updated"]);

  console.log("✅ 辞書データのクリアが完了しました");
}

// 同義語データをバッチ保存
async function saveSynonymsBatch(
  kv: Deno.Kv,
  synonymMap: SynonymMap,
  dictionaryWords: string[],
): Promise<void> {
  console.log("💾 辞書データを保存中...");

  const batchSize = 100;
  const synonymEntries = Object.entries(synonymMap);

  for (let i = 0; i < synonymEntries.length; i += batchSize) {
    const batch = synonymEntries.slice(i, i + batchSize);
    const operations: Deno.AtomicOperation = kv.atomic();

    for (const [key, value] of batch) {
      operations.set(["synonyms", key], value);
    }

    await operations.commit();
    console.log(
      `📦 ${
        Math.min(i + batchSize, synonymEntries.length)
      }/${synonymEntries.length} エントリを保存`,
    );
  }

  // メタデータを保存
  await kv.set(["dictionary", "initialized"], true);
  await kv.set(["dictionary", "word_count"], dictionaryWords.length);
  await kv.set(["dictionary", "last_updated"], new Date().toISOString());

  console.log("✅ 辞書データの保存が完了しました");
}

// 辞書統計情報を取得
async function getKvStats(kv: Deno.Kv) {
  const isInit = await kv.get(["dictionary", "initialized"]);
  const wordCount = await kv.get(["dictionary", "word_count"]);
  const lastUpdated = await kv.get(["dictionary", "last_updated"]);

  return {
    isInitialized: isInit.value || false,
    wordCount: wordCount.value || 0,
    lastUpdated: lastUpdated.value || null,
  };
}

// メイン処理
async function main() {
  console.log("🚀 リモートKV辞書初期化を開始");

  const kv = await connectToRemoteKv();

  try {
    // 現在の状態をチェック
    const stats = await getKvStats(kv);
    console.log("📊 現在の辞書状態:", stats);

    if (stats.isInitialized) {
      const answer = prompt(
        "⚠️ 辞書は既に初期化されています。再初期化しますか？ (y/N): ",
      );
      if (answer?.toLowerCase() !== "y") {
        console.log("❌ 初期化をキャンセルしました");
        kv.close();
        return;
      }
      await clearKvDictionary(kv);
    }

    const synonymMap: SynonymMap = {};
    const dictionaryWords = new Set<string>();

    console.log("📥 Sudachi同義語辞書をダウンロード中...");
    const response = await fetch(
      "https://raw.githubusercontent.com/WorksApplications/SudachiDict/refs/heads/develop/src/main/text/synonyms.txt",
    );

    if (!response.ok) {
      throw new Error(`辞書ダウンロードエラー: ${response.status}`);
    }

    const data = await response.text();
    console.log(`📄 辞書データサイズ: ${Math.round(data.length / 1024)}KB`);

    console.log("⚡ トークン効率最適化マッピングを構築中...");

    const lines = data.trim().split("\n");
    const groupMap = new Map<string, string[]>();

    // まずグループIDごとに単語をまとめる
    console.log("📋 同義語グループを構築中...");
    let processedLines = 0;
    let validWords = 0;

    for (const line of lines) {
      processedLines++;

      if (processedLines % 10000 === 0) {
        console.log(
          `📈 グループ構築進捗: ${processedLines}/${lines.length} (${
            Math.round(processedLines / lines.length * 100)
          }%) - 有効単語: ${validWords}`,
        );
      }

      if (line.startsWith("#") || !line.trim()) continue;

      const parts = line.split(",");
      if (parts.length < 9) continue;

      const groupId = parts[0];
      const word = parts[8]; // 9番目の要素が単語

      // デバッグ用：最初の10行を表示
      if (validWords < 10) {
        console.log(
          `デバッグ: グループ${groupId}, 単語: "${word}", パーツ数: ${parts.length}`,
        );
      }

      // 展開制御フラグが2（弊害語）の場合はスキップ
      if (parts.length >= 7 && parts[6] === "2") {
        continue;
      }

      if (!word || !isJapanese(word)) continue;

      validWords++;
      dictionaryWords.add(word);

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, []);
      }
      groupMap.get(groupId)!.push(word);
    }

    console.log(`📊 ${groupMap.size}個の同義語グループを構築`);
    console.log("🔄 最適化マッピングを生成中...");

    let processedGroups = 0;
    for (const [_groupId, words] of groupMap) {
      processedGroups++;

      if (processedGroups % 1000 === 0) {
        console.log(
          `📈 マッピング進捗: ${processedGroups}/${groupMap.size} グループ (${
            Math.round(processedGroups / groupMap.size * 100)
          }%)`,
        );
      }

      // グループ内の各単語ペアについて最適化可能性をチェック
      for (let i = 0; i < words.length; i++) {
        for (let j = 0; j < words.length; j++) {
          if (i === j) continue;

          const original = words[i];
          const optimized = words[j];

          if (shouldOptimize(original, optimized)) {
            synonymMap[original] = optimized;
          }
        }
      }
    }

    console.log(
      `📊 構築完了: ${Object.keys(synonymMap).length}個の最適化マッピング`,
    );

    // リモートKVに保存
    await saveSynonymsBatch(kv, synonymMap, Array.from(dictionaryWords));

    // 最終統計
    const finalStats = await getKvStats(kv);
    console.log("🎉 初期化完了:");
    console.log(`   - 単語数: ${finalStats.wordCount}`);
    console.log(`   - 最適化マッピング数: ${Object.keys(synonymMap).length}`);
    console.log(`   - 更新日時: ${finalStats.lastUpdated}`);
  } catch (error) {
    console.error("💥 初期化処理中にエラーが発生:", error);
    throw error;
  } finally {
    kv.close();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ スクリプト実行エラー:", error);
    Deno.exit(1);
  });
}
