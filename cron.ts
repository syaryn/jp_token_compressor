/**
 * Deno Cron定義ファイル
 * 辞書の自動更新スケジュール
 */

import { getEncoding } from "js-tiktoken";
import {
  clearKvDictionary,
  getDictionaryMetadata,
  getKvStats,
  saveSynonymsBatch,
} from "./utils/kv.ts";

interface SynonymMap {
  [key: string]: string;
}

// GPT-4oエンコーダーを初期化
const encoder = getEncoding("o200k_base");

function getTokenCount(text: string): number {
  return encoder.encode(text).length;
}

function isJapanese(text: string): boolean {
  return /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+$/.test(text);
}

function isAlphabet(text: string): boolean {
  return /^[a-zA-Z]+$/.test(text);
}

function shouldOptimize(original: string, optimized: string): boolean {
  if (isJapanese(original) && isAlphabet(optimized)) return false;
  if (isAlphabet(original) && isJapanese(optimized)) return false;

  const originalTokens = getTokenCount(original);
  const optimizedTokens = getTokenCount(optimized);

  if (optimizedTokens >= originalTokens) return false;
  return true;
}

async function downloadAndBuildSynonymDict(): Promise<{
  synonymMap: SynonymMap;
  dictionaryWords: string[];
}> {
  console.log("🕰️ [CRON] Sudachi同義語辞書の自動更新を開始");

  const synonymMap: SynonymMap = {};
  const dictionaryWords = new Set<string>();

  const response = await fetch(
    "https://raw.githubusercontent.com/WorksApplications/SudachiDict/refs/heads/develop/src/main/text/synonyms.txt",
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const text = await response.text();
  console.log(
    `📄 [CRON] 辞書データサイズ: ${Math.round(text.length / 1024)}KB`,
  );

  const synonymGroups: {
    [id: string]: Array<{ word: string; expansionFlag: string }>;
  } = {};

  const lines = text.split("\n");
  for (const line of lines) {
    if (line.trim() && !line.startsWith("#")) {
      const parts = line.split(",");
      if (parts.length >= 9) {
        const groupId = parts[0];
        const expansionFlag = parts[2] || "0";
        const word = parts[8];

        if (word && word.trim()) {
          const cleanWord = word.trim();
          if (!synonymGroups[groupId]) {
            synonymGroups[groupId] = [];
          }
          synonymGroups[groupId].push({
            word: cleanWord,
            expansionFlag: expansionFlag,
          });
          dictionaryWords.add(cleanWord);
        }
      }
    }
  }

  // 同義語マッピング構築
  for (const wordEntries of Object.values(synonymGroups)) {
    if (wordEntries.length > 1) {
      const validTargets = wordEntries.filter((entry) =>
        entry.expansionFlag !== "2"
      );

      if (validTargets.length === 0) continue;

      const mostEfficient = validTargets.reduce((a, b) => {
        const tokensA = getTokenCount(a.word);
        const tokensB = getTokenCount(b.word);
        const isJapaneseA = isJapanese(a.word);
        const isJapaneseB = isJapanese(b.word);

        if (isJapaneseA && !isJapaneseB) return a;
        if (!isJapaneseA && isJapaneseB) return b;

        return tokensA < tokensB ||
            (tokensA === tokensB && a.word.length < b.word.length)
          ? a
          : b;
      });

      for (const wordEntry of wordEntries) {
        const { word, expansionFlag } = wordEntry;
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
    `✅ [CRON] ${Object.keys(synonymMap).length}個の同義語マッピングを構築`,
  );
  return { synonymMap, dictionaryWords: Array.from(dictionaryWords) };
}

async function shouldUpdateDictionary(): Promise<boolean> {
  try {
    const metadata = await getDictionaryMetadata();

    if (!metadata) {
      console.log("📋 [CRON] 辞書メタデータなし - 初回更新が必要");
      return true;
    }

    const lastUpdated = new Date(metadata.lastUpdated);
    const now = new Date();
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
    );

    console.log(
      `📅 [CRON] 前回更新: ${metadata.lastUpdated} (${daysSinceUpdate}日前)`,
    );

    if (daysSinceUpdate >= 1) {
      console.log("🔄 [CRON] 24時間以上経過 - 更新が必要");
      return true;
    }

    console.log("✅ [CRON] 辞書は最新 - 更新不要");
    return false;
  } catch (error) {
    console.error("⚠️ [CRON] 更新チェックエラー:", error);
    return true;
  }
}

async function updateDictionary(): Promise<void> {
  const startTime = Date.now();
  console.log(`🚀 [CRON] 辞書自動更新開始: ${new Date().toISOString()}`);

  try {
    if (!(await shouldUpdateDictionary())) {
      console.log("⏭️ [CRON] 更新をスキップしました");
      return;
    }

    const oldMetadata = await getDictionaryMetadata();
    const { synonymMap, dictionaryWords } = await downloadAndBuildSynonymDict();

    console.log("🗑️ [CRON] 既存辞書をクリア中...");
    await clearKvDictionary();

    console.log("💾 [CRON] 新しい辞書をKVに保存中...");
    await saveSynonymsBatch(synonymMap, dictionaryWords);

    const finalStats = await getKvStats();
    const updateTime = Math.round((Date.now() - startTime) / 1000);

    console.log("🎉 [CRON] 辞書自動更新完了！");
    console.log(`⏱️ [CRON] 更新時間: ${updateTime}秒`);
    console.log(
      `📈 [CRON] 統計: ${finalStats.synonymCount}個の同義語, ${finalStats.dictionaryWordCount}個の辞書単語`,
    );

    // 更新結果の比較ログ
    if (oldMetadata) {
      const synonymDiff = finalStats.synonymCount - oldMetadata.synonymCount;
      const wordDiff = finalStats.dictionaryWordCount -
        oldMetadata.dictionaryWordCount;
      console.log(
        `📊 [CRON] 変更: 同義語${
          synonymDiff >= 0 ? "+" : ""
        }${synonymDiff}, 辞書単語${wordDiff >= 0 ? "+" : ""}${wordDiff}`,
      );
    }
  } catch (error) {
    console.error("💥 [CRON] 辞書自動更新に失敗:", error);
    throw error;
  }
}

// 毎日深夜2時(JST)に辞書を更新
// JST深夜2時は UTC 17時前日 (日本は UTC+9)
Deno.cron("Update Sudachi Dictionary", "0 17 * * *", async () => {
  await updateDictionary();
});

console.log(
  "📅 Cron job registered: Daily dictionary update at 2:00 AM JST (17:00 UTC)",
);
