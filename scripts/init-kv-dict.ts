#!/usr/bin/env -S deno run -A

/**
 * Sudachi同義語辞書のKV初期化スクリプト
 * KVストレージへの辞書データ初期設定・再構築
 */

import { getEncoding } from "js-tiktoken";
import {
  clearKvDictionary,
  getKvStats,
  isDictionaryInitialized,
  saveSynonymsBatch,
} from "../utils/kv.ts";

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

  // トークン数が減らない場合は変換しない
  if (optimizedTokens >= originalTokens) {
    return false;
  }

  // 任意のトークン削減効果がある場合に変換
  return true;
}

async function downloadAndBuildSynonymDict(): Promise<
  { synonymMap: SynonymMap; dictionaryWords: string[] }
> {
  console.log("📥 Sudachi同義語辞書をダウンロード中...");

  const synonymMap: SynonymMap = {};
  const dictionaryWords = new Set<string>();

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/WorksApplications/SudachiDict/refs/heads/develop/src/main/text/synonyms.txt",
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log(`📄 辞書データサイズ: ${Math.round(text.length / 1024)}KB`);

    // 同義語グループをIDで管理（展開制御フラグも記録）
    const synonymGroups: {
      [id: string]: Array<{ word: string; expansionFlag: string }>;
    } = {};

    const lines = text.split("\n");
    console.log("🔍 辞書データを解析中...");

    for (const line of lines) {
      if (line.trim() && !line.startsWith("#")) {
        const parts = line.split(",");
        if (parts.length >= 9) {
          const groupId = parts[0]; // 同義語グループのID
          const expansionFlag = parts[2] || "0"; // 展開制御フラグ（省略時は0）
          const word = parts[8]; // 単語（9番目の要素）

          if (word && word.trim()) {
            const cleanWord = word.trim();
            if (!synonymGroups[groupId]) {
              synonymGroups[groupId] = [];
            }
            synonymGroups[groupId].push({
              word: cleanWord,
              expansionFlag: expansionFlag,
            });
            // 辞書に存在する全ての単語を記録
            dictionaryWords.add(cleanWord);
          }
        }
      }
    }

    console.log("⚡ トークン効率最適化マッピングを構築中...");

    // 各グループで最もトークン効率の良い単語を見つけて、他の単語をマッピング
    for (const wordEntries of Object.values(synonymGroups)) {
      if (wordEntries.length > 1) {
        // 変換先として使用可能な単語のみを対象（フラグ=2は除外）
        const validTargets = wordEntries.filter((entry) =>
          entry.expansionFlag !== "2"
        );

        if (validTargets.length === 0) continue; // 有効な変換先がない場合はスキップ

        // 実際のトークン数で最も効率的な単語を選択（日本語を優先）
        const mostEfficient = validTargets.reduce((a, b) => {
          const tokensA = getTokenCount(a.word);
          const tokensB = getTokenCount(b.word);
          const isJapaneseA = isJapanese(a.word);
          const isJapaneseB = isJapanese(b.word);

          // 日本語を優先: 両方が日本語または両方が非日本語の場合のみトークン数で比較
          if (isJapaneseA && !isJapaneseB) return a; // aが日本語、bが非日本語
          if (!isJapaneseA && isJapaneseB) return b; // aが非日本語、bが日本語

          // トークン数が少ない方を選択、同じ場合は文字数が少ない方
          return tokensA < tokensB ||
              (tokensA === tokensB && a.word.length < b.word.length)
            ? a
            : b;
        });

        // グループ内の他の単語を最効率単語にマッピング
        // ただし、展開制御フラグが0（常に展開）の単語のみを変換元として許可
        for (const wordEntry of wordEntries) {
          const { word, expansionFlag } = wordEntry;

          // 展開制御フラグをチェック
          // 0: 常に展開に使用する（変換元として許可）
          // 1: 自分自身が展開のトリガーとはならない（変換元として不許可）
          // 2: 常に展開に使用しない（変換元として不許可）
          if (
            word !== mostEfficient.word &&
            expansionFlag === "0" &&
            shouldOptimize(word, mostEfficient.word)
          ) {
            synonymMap[word] = mostEfficient.word;
          }
        }
      }
    }

    console.log(
      `✅ 完了: ${Object.keys(synonymMap).length}個の同義語マッピングを構築`,
    );
    console.log(`📊 ${Object.keys(synonymGroups).length}グループから処理`);
    console.log(`📖 ${dictionaryWords.size}個の辞書単語を記録`);

    return { synonymMap, dictionaryWords: Array.from(dictionaryWords) };
  } catch (error) {
    console.error("❌ 辞書のダウンロード・構築に失敗:", error);
    throw error;
  }
}

// メイン処理
async function main() {
  console.log("🚀 Sudachi同義語辞書のKV初期化を開始");

  try {
    // 既存の辞書状況をチェック
    const isInitialized = await isDictionaryInitialized();
    if (isInitialized) {
      const stats = await getKvStats();
      console.log("📊 既存のKV辞書が見つかりました:");
      console.log(`   同義語: ${stats.synonymCount}個`);
      console.log(`   辞書単語: ${stats.dictionaryWordCount}個`);
      console.log(`   最終更新: ${stats.lastUpdated}`);

      const shouldOverwrite = confirm("既存の辞書を上書きしますか？");
      if (!shouldOverwrite) {
        console.log("⏹️ 初期化処理をキャンセルしました");
        return;
      }

      console.log("🗑️ 既存のKV辞書をクリア中...");
      await clearKvDictionary();
    }

    // 辞書データをダウンロード・構築
    const { synonymMap, dictionaryWords } = await downloadAndBuildSynonymDict();

    // KVストレージに保存
    console.log("💾 Deno KVにデータを保存中...");
    await saveSynonymsBatch(synonymMap, dictionaryWords);

    // 保存結果を確認
    const finalStats = await getKvStats();
    console.log("🎉 KV辞書の初期化が完了しました！");
    console.log(`📈 保存されたデータ:`);
    console.log(`   同義語マッピング: ${finalStats.synonymCount}個`);
    console.log(`   辞書単語: ${finalStats.dictionaryWordCount}個`);
    console.log(`📅 最終更新: ${finalStats.lastUpdated}`);

    console.log("\n✨ これで以下の利点が得られます:");
    console.log("  - 高速な辞書検索（KVの高性能）");
    console.log("  - メモリ使用量の削減");
    console.log("  - Deno Deployでの自動スケーリング");
    console.log("  - データの永続化保証");
  } catch (error) {
    console.error("💥 初期化処理に失敗しました:", error);
    Deno.exit(1);
  }
}

// スクリプト実行時のメイン処理
if (import.meta.main) {
  await main();
}
