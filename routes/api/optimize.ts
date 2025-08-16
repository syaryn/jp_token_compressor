import { Handler } from "$fresh/server.ts";
import { tokenize } from "wakachigaki";
import { getEncoding } from "js-tiktoken";

interface SynonymMap {
  [key: string]: string;
}

const synonymMap: SynonymMap = {};
const dictionaryWords = new Set<string>();
let isLoaded = false;

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

// 複合語を貪欲アルゴリズムで最適化する
function optimizeCompoundWord(word: string, synonymMap: SynonymMap): string {
  if (word.length < 3) return word; // 短すぎる場合はそのまま

  // まず単語全体が辞書に存在するかチェック
  if (dictionaryWords.has(word)) {
    return word;
  }

  // 最長マッチを探す（後ろから1文字ずつ削る）
  for (let endPos = word.length; endPos >= 3; endPos--) {
    const candidate = word.substring(0, endPos);
    if (synonymMap[candidate]) {
      // マッチした部分を置換し、残りの部分を再帰的に処理
      const replacement = synonymMap[candidate];
      const remaining = word.substring(endPos);
      const optimizedRemaining = remaining.length >= 3
        ? optimizeCompoundWord(remaining, synonymMap)
        : remaining;
      return replacement + optimizedRemaining;
    }
  }

  // マッチしなかった場合はそのまま返す
  return word;
}

async function loadSynonymDict(): Promise<void> {
  if (isLoaded) return;

  // 既存のデータをクリア
  Object.keys(synonymMap).forEach((key) => delete synonymMap[key]);
  dictionaryWords.clear();

  try {
    // まず事前構築された辞書ファイルを試す
    try {
      console.log("📚 事前構築された辞書データを読み込み中...");
      const prebuiltResponse = await fetch("/synonym-dict.json");
      if (prebuiltResponse.ok) {
        const prebuiltData = await prebuiltResponse.json();
        Object.assign(synonymMap, prebuiltData.synonymMap || prebuiltData);
        if (prebuiltData.dictionaryWords) {
          prebuiltData.dictionaryWords.forEach((word: string) =>
            dictionaryWords.add(word)
          );
        }
        isLoaded = true;
        console.log(
          `✅ 事前構築辞書から ${
            Object.keys(synonymMap).length
          } 個のマッピングを高速読み込み`,
        );
        return;
      }
    } catch (_prebuiltError) {
      console.log("⚠️ 事前構築辞書が見つからないため、リアルタイム構築を実行");
    }

    // フォールバック: リアルタイムでダウンロード・構築
    console.log("📥 Sudachi辞書をリアルタイムダウンロード中...");
    const response = await fetch(
      "https://raw.githubusercontent.com/WorksApplications/SudachiDict/refs/heads/develop/src/main/text/synonyms.txt",
    );
    const text = await response.text();

    // 同義語グループをIDで管理（展開制御フラグも記録）
    const synonymGroups: {
      [id: string]: Array<{ word: string; expansionFlag: string }>;
    } = {};

    const lines = text.split("\n");
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

    isLoaded = true;
    console.log(
      `Loaded ${Object.keys(synonymMap).length} synonym mappings from ${
        Object.keys(synonymGroups).length
      } groups`,
    );
  } catch (error) {
    console.error("Failed to load synonym dictionary:", error);
  }
}

function optimizeText(text: string): string {
  // 行ごとに処理して元の構造を保持
  const lines = text.split("\n");

  const optimizedLines = lines.map((line) => {
    if (line.trim() === "") return line; // 空行はそのまま

    // 各行を独立して形態素解析
    const tokens = tokenize(line);

    // 各単語を同義語辞書で置き換え（部分マッチも含む）
    const optimizedTokens = tokens.map((token: string) => {
      // 完全マッチを最優先（辞書に完全一致がある場合は部分マッチを適用しない）
      const exactReplacement = synonymMap[token];
      if (exactReplacement) {
        return exactReplacement;
      }

      // 部分マッチ（複合語内の置換）- 完全マッチがない場合のみ
      // ただし、トークン自体が辞書に存在する場合は部分マッチを適用しない
      let optimizedToken = token;
      if (!dictionaryWords.has(token)) {
        // 貪欲アルゴリズムで最長マッチを探す
        optimizedToken = optimizeCompoundWord(token, synonymMap);
      }

      return optimizedToken;
    });

    return optimizedTokens.join("");
  });

  return optimizedLines.join("\n");
}

export const handler: Handler = async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // 同義語辞書をロード（初回のみ）
    await loadSynonymDict();

    const body = await req.json();
    const { text } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const optimizedText = optimizeText(text);

    return new Response(
      JSON.stringify({
        original: text,
        optimized: optimizedText,
        tokenCount: {
          original: getTokenCount(text),
          optimized: getTokenCount(optimizedText),
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error processing text:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
