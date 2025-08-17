import { Handler } from "$fresh/server.ts";
import { tokenize } from "wakachigaki";
import { getEncoding } from "js-tiktoken";
import {
  getKvStats,
  getSynonym,
  initializeDictionary,
  isDictionaryInitialized,
  wordExistsInDictionary,
} from "../../utils/kv.ts";

// GPT-4oエンコーダーを初期化
const encoder = getEncoding("o200k_base");

// 実際のトークン数を計測
function getTokenCount(text: string): number {
  return encoder.encode(text).length;
}

// 複合語を貪欲アルゴリズムで最適化する（KV版）
async function optimizeCompoundWord(word: string): Promise<string> {
  if (word.length < 3) return word; // 短すぎる場合はそのまま

  // まず単語全体が辞書に存在するかチェック
  if (await wordExistsInDictionary(word)) {
    return word;
  }

  // 最長マッチを探す（後ろから1文字ずつ削る）
  for (let endPos = word.length; endPos >= 3; endPos--) {
    const candidate = word.substring(0, endPos);
    const replacement = await getSynonym(candidate);
    if (replacement) {
      // マッチした部分を置換し、残りの部分を再帰的に処理
      const remaining = word.substring(endPos);
      const optimizedRemaining = remaining.length >= 3
        ? await optimizeCompoundWord(remaining)
        : remaining;
      return replacement + optimizedRemaining;
    }
  }

  // マッチしなかった場合はそのまま返す
  return word;
}

// KV辞書の初期化チェック（必要に応じて自動初期化）
async function checkKvDictionary(): Promise<void> {
  const isInitialized = await isDictionaryInitialized();

  if (!isInitialized) {
    console.log("⚠️ KV辞書が初期化されていません - 自動初期化を開始");

    try {
      // 自動初期化を実行
      await initializeDictionary();
      console.log("✅ KV辞書の自動初期化が完了しました");
    } catch (error) {
      console.error("❌ KV辞書の自動初期化に失敗:", error);
      throw new Error(
        "辞書の初期化に失敗しました。管理者にお問い合わせください。",
      );
    }
  }

  const stats = await getKvStats();
  console.log(
    `✅ KV辞書読み込み完了: ${stats.synonymCount}個の同義語, ${stats.dictionaryWordCount}個の辞書単語`,
  );
}

async function optimizeText(text: string): Promise<string> {
  // 行ごとに処理して元の構造を保持
  const lines = text.split("\n");

  const optimizedLines = await Promise.all(lines.map(async (line) => {
    if (line.trim() === "") return line; // 空行はそのまま

    // 各行を独立して形態素解析
    const tokens = tokenize(line);

    // 各単語を同義語辞書で置き換え（部分マッチも含む）
    const optimizedTokens = await Promise.all(
      tokens.map(async (token: string) => {
        // 完全マッチを最優先（辞書に完全一致がある場合は部分マッチを適用しない）
        const exactReplacement = await getSynonym(token);
        if (exactReplacement) {
          return exactReplacement;
        }

        // 部分マッチ（複合語内の置換）- 完全マッチがない場合のみ
        // ただし、トークン自体が辞書に存在する場合は部分マッチを適用しない
        let optimizedToken = token;
        if (!(await wordExistsInDictionary(token))) {
          // 貪欲アルゴリズムで最長マッチを探す
          optimizedToken = await optimizeCompoundWord(token);
        }

        return optimizedToken;
      }),
    );

    return optimizedTokens.join("");
  }));

  return optimizedLines.join("\n");
}

export const handler: Handler = async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // KV辞書の初期化チェック
    await checkKvDictionary();

    const body = await req.json();
    const { text } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const optimizedText = await optimizeText(text);

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
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
