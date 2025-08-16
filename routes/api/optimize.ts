import { Handler } from "$fresh/server.ts";
import { tokenize } from "wakachigaki";
import { getEncoding } from "js-tiktoken";

interface SynonymMap {
  [key: string]: string;
}

const synonymMap: SynonymMap = {};
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

  // 十分なトークン削減効果がある場合のみ変換（20%以上削減）
  const reductionRate = (originalTokens - optimizedTokens) / originalTokens;
  return reductionRate >= 0.2;
}

async function loadSynonymDict(): Promise<void> {
  if (isLoaded) return;

  try {
    // まず事前構築された辞書ファイルを試す
    try {
      console.log("📚 事前構築された辞書データを読み込み中...");
      const prebuiltResponse = await fetch("/synonym-dict.json");
      if (prebuiltResponse.ok) {
        const prebuiltData = await prebuiltResponse.json();
        Object.assign(synonymMap, prebuiltData);
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

    // 同義語グループをIDで管理
    const synonymGroups: { [id: string]: string[] } = {};

    const lines = text.split("\n");
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
          if (word !== mostEfficient && shouldOptimize(word, mostEfficient)) {
            synonymMap[word] = mostEfficient;
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
  // 単語分割
  const tokens = tokenize(text);

  // 各単語を同義語辞書で置き換え
  const optimizedTokens = tokens.map((token: string) => {
    return synonymMap[token] || token;
  });

  return optimizedTokens.join("");
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
