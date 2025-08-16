#!/usr/bin/env -S deno run -A

/**
 * Sudachi同義語辞書の事前ダウンロード・構築スクリプト
 * デプロイ時に実行して辞書データを準備する
 */

import { getEncoding } from "js-tiktoken";

interface SynonymMap {
  [key: string]: string;
}

// GPT-4oエンコーダーを初期化
const encoder = getEncoding("o200k_base");

// 実際のトークン数を計測
function getTokenCount(text: string): number {
  return encoder.encode(text).length;
}

async function downloadAndBuildSynonymDict(): Promise<SynonymMap> {
  console.log("📥 Sudachi同義語辞書をダウンロード中...");

  const synonymMap: SynonymMap = {};

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/WorksApplications/SudachiDict/refs/heads/develop/src/main/text/synonyms.txt",
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log(`📄 辞書データサイズ: ${Math.round(text.length / 1024)}KB`);

    // 同義語グループをIDで管理
    const synonymGroups: { [id: string]: string[] } = {};

    const lines = text.split("\n");
    console.log("🔍 辞書データを解析中...");

    for (const line of lines) {
      if (line.trim() && !line.startsWith("#")) {
        const parts = line.split(",");
        if (parts.length >= 9) {
          const groupId = parts[0]; // 同義語グループのID
          const word = parts[8]; // 単語（9番目の要素）

          if (word && word.trim()) {
            const cleanWord = word.trim();
            if (!synonymGroups[groupId]) {
              synonymGroups[groupId] = [];
            }
            synonymGroups[groupId].push(cleanWord);
          }
        }
      }
    }

    console.log("⚡ トークン効率最適化マッピングを構築中...");

    // 各グループで最もトークン効率の良い単語を見つけて、他の単語をマッピング
    for (const words of Object.values(synonymGroups)) {
      if (words.length > 1) {
        // 実際のトークン数で最も効率的な単語を選択
        const mostEfficient = words.reduce((a, b) => {
          const tokensA = getTokenCount(a);
          const tokensB = getTokenCount(b);
          // トークン数が少ない方を選択、同じ場合は文字数が少ない方
          return tokensA < tokensB ||
              (tokensA === tokensB && a.length < b.length)
            ? a
            : b;
        });

        // グループ内の他の単語を最効率単語にマッピング
        for (const word of words) {
          if (
            word !== mostEfficient &&
            getTokenCount(word) > getTokenCount(mostEfficient)
          ) {
            synonymMap[word] = mostEfficient;
          }
        }
      }
    }

    console.log(
      `✅ 完了: ${Object.keys(synonymMap).length}個の同義語マッピングを構築`,
    );
    console.log(`📊 ${Object.keys(synonymGroups).length}グループから処理`);

    return synonymMap;
  } catch (error) {
    console.error("❌ 辞書のダウンロード・構築に失敗:", error);
    throw error;
  }
}

// 辞書データをJSONファイルとして保存
async function saveSynonymDict(synonymMap: SynonymMap): Promise<void> {
  const outputPath = "./static/synonym-dict.json";

  console.log(`💾 辞書データを保存中: ${outputPath}`);

  try {
    await Deno.writeTextFile(outputPath, JSON.stringify(synonymMap));

    const stats = await Deno.stat(outputPath);
    console.log(`✅ 保存完了: ${Math.round(stats.size / 1024)}KB`);
  } catch (error) {
    console.error("❌ 辞書データの保存に失敗:", error);
    throw error;
  }
}

// メイン処理
if (import.meta.main) {
  console.log("🚀 Sudachi同義語辞書の事前構築を開始");

  try {
    const synonymMap = await downloadAndBuildSynonymDict();
    await saveSynonymDict(synonymMap);

    console.log("🎉 辞書の事前構築が完了しました！");
    console.log("📈 これにより初回実行時の待機時間が大幅に短縮されます");
  } catch (error) {
    console.error("💥 処理に失敗しました:", error);
    Deno.exit(1);
  }
}
