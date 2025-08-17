#!/usr/bin/env -S deno run -A --unstable-kv
/**
 * Sudachi同義語辞書KV初期化スクリプト (統一版)
 * ローカルKVまたはリモートKVを初期化します
 */

import { getEncoding } from "js-tiktoken";
import { getKvInstance } from "../utils/kv.ts";

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

async function downloadAndBuildSynonymDict(): Promise<{
  synonymMap: SynonymMap;
  dictionaryWords: string[];
}> {
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

// KVクリア関数（任意のKVインスタンス対応）
async function clearKvDictionaryCustom(kv: Deno.Kv): Promise<void> {
  try {
    // 同義語データを削除
    const synonymsIter = kv.list({ prefix: ["synonyms"] });
    const atomic1 = kv.atomic();
    for await (const entry of synonymsIter) {
      atomic1.delete(entry.key);
    }
    await atomic1.commit();

    // 辞書データを削除
    const dictIter = kv.list({ prefix: ["dictionary"] });
    const atomic2 = kv.atomic();
    for await (const entry of dictIter) {
      atomic2.delete(entry.key);
    }
    await atomic2.commit();

    // メタデータを削除
    await kv.delete(["metadata", "dictionary"]);

    console.log("🗑️ KV辞書をクリアしました");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("ℹ️ クリア処理中にエラー（初回時は正常）:", message);
  }
}

// KV保存関数（任意のKVインスタンス対応）
async function saveSynonymsBatchCustom(
  kv: Deno.Kv,
  synonymMap: Record<string, string>,
  dictionaryWords: string[],
  batchSize = 500, // リモートKV対応でサイズを縮小
): Promise<void> {
  const allEntries = [
    // 同義語マッピング
    ...Object.entries(synonymMap).map(([word, replacement]) => ({
      key: ["synonyms", word],
      value: replacement,
    })),
    // 辞書単語フラグ
    ...dictionaryWords.map((word) => ({
      key: ["dictionary", word],
      value: true,
    })),
  ];

  console.log(`📦 ${allEntries.length}件のデータをバッチ処理で保存中...`);

  // バッチサイズごとに分割して処理（リトライ機能付き）
  for (let i = 0; i < allEntries.length; i += batchSize) {
    const batch = allEntries.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(allEntries.length / batchSize);

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        const atomic = kv.atomic();
        for (const entry of batch) {
          atomic.set(entry.key, entry.value);
        }

        const result = await atomic.commit();
        if (!result.ok) {
          throw new Error(`Atomic commit failed`);
        }

        console.log(`✅ バッチ ${batchNum}/${totalBatches} 完了`);
        break; // 成功したらループを抜ける
      } catch (error) {
        retryCount++;
        const message = error instanceof Error ? error.message : String(error);

        if (retryCount > maxRetries) {
          throw new Error(
            `KVバッチ処理に失敗 (batch ${batchNum}, ${maxRetries}回リトライ後): ${message}`,
          );
        }

        console.log(
          `⚠️ バッチ ${batchNum} 失敗、リトライ ${retryCount}/${maxRetries}: ${message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount)); // 指数バックオフ
      }
    }
  }

  // メタデータを保存
  const metadata = {
    version: new Date().toISOString(),
    synonymCount: Object.keys(synonymMap).length,
    dictionaryWordCount: dictionaryWords.length,
    lastUpdated: new Date().toISOString(),
    buildSource: "sudachi",
  };

  await kv.set(["metadata", "dictionary"], metadata);
  console.log(
    `📊 メタデータ保存完了: ${metadata.synonymCount}個の同義語, ${metadata.dictionaryWordCount}個の辞書単語`,
  );
}

// リモートKV接続（環境変数から取得）
async function connectToRemoteKv() {
  const accessToken = Deno.env.get("DENO_KV_ACCESS_TOKEN");
  const databaseId = Deno.env.get("DENO_KV_DATABASE_ID");

  if (!accessToken) {
    throw new Error(
      "DENO_KV_ACCESS_TOKEN環境変数が設定されていません。Deno Deployのアクセストークンを設定してください。",
    );
  }

  if (!databaseId) {
    throw new Error(
      "DENO_KV_DATABASE_ID環境変数が設定されていません。Deno DeployのデータベースIDを設定してください。",
    );
  }

  try {
    const kv = await Deno.openKv(
      `https://api.deno.com/databases/${databaseId}/connect`,
    );
    console.log("✅ リモートKVデータベースに接続しました");
    return kv;
  } catch (error) {
    console.error("❌ リモートKV接続エラー:", error);
    console.log(
      "💡 ヒント: DENO_KV_ACCESS_TOKEN と DENO_KV_DATABASE_ID 環境変数が正しく設定されているか確認してください",
    );
    throw error;
  }
}

// KV辞書の状態取得
async function getKvStats(kv: Deno.Kv) {
  try {
    // utils/kv.tsと互換性のあるメタデータチェック
    const metadataResult = await kv.get(["metadata", "dictionary"]);
    if (metadataResult.value) {
      const metadata = metadataResult.value as {
        synonymCount?: number;
        dictionaryWordCount?: number;
        lastUpdated?: string;
      };
      return {
        isInitialized: true,
        synonymCount: metadata.synonymCount || 0,
        dictionaryWordCount: metadata.dictionaryWordCount || 0,
        lastUpdated: metadata.lastUpdated || null,
      };
    }

    // フォールバック: リモートKVスクリプト互換のキーをチェック
    const isInit = await kv.get(["dictionary", "initialized"]);
    const synonymCount = await kv.get(["dictionary", "synonym_count"]);
    const dictionaryWordCount = await kv.get(["dictionary", "word_count"]);
    const lastUpdated = await kv.get(["dictionary", "last_updated"]);

    return {
      isInitialized: isInit.value || false,
      synonymCount: synonymCount.value || 0,
      dictionaryWordCount: dictionaryWordCount.value || 0,
      lastUpdated: lastUpdated.value || null,
    };
  } catch (error) {
    // 初回初期化時や権限エラー等でメタデータが取得できない場合
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      "ℹ️ メタデータを取得できません（初回初期化時は正常）:",
      message,
    );
    return {
      isInitialized: false,
      synonymCount: 0,
      dictionaryWordCount: 0,
      lastUpdated: null,
    };
  }
}

async function main() {
  const args = Deno.args;
  const isRemote = args.includes("--remote") || args.includes("-r");

  console.log(
    `🚀 Sudachi同義語辞書のKV初期化を開始 (${
      isRemote ? "リモート" : "ローカル"
    })`,
  );

  // KV接続
  let kv: Deno.Kv;
  if (isRemote) {
    kv = await connectToRemoteKv();
  } else {
    kv = await getKvInstance();
    console.log("✅ ローカルKVデータベースに接続しました");
  }

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

      console.log("🗑️ 既存辞書をクリア中...");
      await clearKvDictionaryCustom(kv);
      console.log("✅ 辞書データのクリアが完了しました");
    }

    // 辞書をダウンロード・構築
    const { synonymMap, dictionaryWords } = await downloadAndBuildSynonymDict();

    // KVに保存
    console.log("💾 Deno KVにデータを保存中...");
    await saveSynonymsBatchCustom(kv, synonymMap, dictionaryWords);

    // 最終統計
    const finalStats = await getKvStats(kv);
    console.log("🎉 KV辞書の初期化が完了しました！");
    console.log(`📈 保存されたデータ:`);
    console.log(`   同義語マッピング: ${finalStats.synonymCount}個`);
    console.log(`   辞書単語: ${finalStats.dictionaryWordCount}個`);
    console.log(`📅 最終更新: ${finalStats.lastUpdated}`);

    console.log(`\n✨ これで以下の利点が得られます:`);
    console.log(`  - 高速な辞書検索（KVの高性能）`);
    console.log(`  - メモリ使用量の削減`);
    if (isRemote) {
      console.log(`  - Deno Deployでの自動スケーリング`);
    }
    console.log(`  - データの永続化保証`);
  } catch (error) {
    console.error("💥 初期化処理中にエラーが発生:", error);
    throw error;
  } finally {
    kv.close();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ 初期化に失敗しました:", error);
    Deno.exit(1);
  });
}
