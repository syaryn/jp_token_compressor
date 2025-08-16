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

async function loadSynonymDict(): Promise<void> {
  if (isLoaded) return;

  try {
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
          if (
            word !== mostEfficient &&
            getTokenCount(word) > getTokenCount(mostEfficient)
          ) {
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
